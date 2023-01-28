import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { RustLambda } from "./modules/rust-lambda";
import {
  AwsIntegration,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { EventBus, Rule, RuleTargetInput } from "aws-cdk-lib/aws-events";
import {
  AnyPrincipal,
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { CfnIntegration, CfnRoute } from "aws-cdk-lib/aws-apigatewayv2";
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const message_counter = new RustLambda(this, "message-counter");
    const eventBus = new EventBus(this, "costastream-events-bus", {
      eventBusName: "costastream-events-bus",
    });

    const snsTopic = new Topic(this, "costastream-messages-topic", {
      topicName: "costastream-messages-topic",
    });
    const eventsTopicTarget = new cdk.aws_events_targets.SnsTopic(snsTopic);

    const eventsRule = new Rule(this, "events-rule", {
      ruleName: "costastream-events-rule",
      targets: [eventsTopicTarget],
      eventBus: eventBus,
      eventPattern: {
        detail: {
          event_type: ["chat_message_received"],
        },
      },
    });

    const putEventsRole = new Role(
      this,
      "costastream-putevents-from-api-execution-role",
      {
        roleName: "costastream-putevents-from-api-execution-role",
        assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      }
    );
    putEventsRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [eventBus.eventBusArn],
        actions: ["events:PutEvents"],
      })
    );

    const api = new RestApi(this, "costastream-api", {
      restApiName: "costastream-api",
    });
    const eventsResource = api.root.addResource("events");

    const eventbridgeIntegration = new AwsIntegration({
      service: "events",
      action: "PutEvents",
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: putEventsRole,
        requestTemplates: {
          "application/json": `
        #set($context.requestOverride.header.X-Amz-Target ="AWSEvents.PutEvents")
        #set($context.requestOverride.header.Content-Type ="application/x-amz-json-1.1")
        ${JSON.stringify({
          Entries: [
            {
              DetailType: "putEvent",
              Detail: "$util.escapeJavaScript($input.json('$'))",
              Source: "async-eventbridge-api",
              EventBusName: eventBus.eventBusArn,
            },
          ],
        })}
      `,
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": JSON.stringify({
                id: "$input.path('$.Entries[0].EventId')",
              }),
            },
          },
        ],
      },
    });

    eventsResource.addMethod("POST", eventbridgeIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    const eventSource = new SnsEventSource(snsTopic);
    message_counter.fn.addEventSource(eventSource);
  }
}
