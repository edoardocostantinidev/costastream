import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { RustLambda } from "./modules/rust-lambda";
import { LambdaIntegration, Method, RestApi } from "aws-cdk-lib/aws-apigateway";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const message_handler = new RustLambda(this, "message-handler");
    const api = new RestApi(this, "costastream-api", {
      restApiName: "costastream-api",
    });
    const messagesResource = api.root.addResource("messages");

    messagesResource.addMethod(
      "POST",
      new LambdaIntegration(message_handler.fn),
      {
        methodResponses: [{ statusCode: "200" }, { statusCode: "502" }],
      }
    );
  }
}
