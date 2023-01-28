import * as cdk from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class RustLambda {
  fn: cdk.aws_lambda.Function;
  constructor(scope: Construct, lambdaName: string) {
    this.fn = new cdk.aws_lambda.Function(scope, `lambda.${lambdaName}`, {
      code: cdk.aws_lambda.Code.fromAsset(
        `../src/${lambdaName}/target/lambda/${lambdaName}`
      ),
      handler: "not.required",
      runtime: cdk.aws_lambda.Runtime.PROVIDED_AL2,
      logRetention: RetentionDays.ONE_WEEK,
    });
  }
}
