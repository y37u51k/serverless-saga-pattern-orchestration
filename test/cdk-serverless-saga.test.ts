import { expect as expectCDK, haveResourceLike, countResourcesLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import TheSagaStepfunction = require('../lib/cdk-serverless-saga-stack');

test('API Gateway Proxy Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::ApiGateway::Resource", {
    "PathPart": "{proxy+}"
  }
  ));
});

test('Saga Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "sagaLambda.handler"
  }
  ));
});

test('Saga Lambda Permissions To Execute StepFunction', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::IAM::Policy", {
    "PolicyDocument": {
      "Statement": [{
        "Action": "states:StartExecution",
        "Effect": "Allow"
      }]
    }
  }
  ));
});



test('1 DynamoDB Table Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(countResourcesLike("AWS::DynamoDB::Table", 3, {
    "KeySchema": [
      {
        "AttributeName": "pk",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "sk",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "pk",
        "AttributeType": "S"
      },
      {
        "AttributeName": "sk",
        "AttributeType": "S"
      }
    ]}
  ));
});




test('Flight Reservation Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "flights/reserveFlight.handler",
    "Runtime": "nodejs12.x"
  }
  ));
});

test('Confirm Flight Reservation Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "flights/confirmFlight.handler",
    "Runtime": "nodejs12.x"
  }
  ));
});

test('Cancel Flight Booking Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "flights/cancelFlight.handler",
    "Runtime": "nodejs12.x"
  }
  ));
});

test('Payment Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "payment/processPayment.handler",
    "Runtime": "nodejs12.x"
  }
  ));
});

test('Cancel Payment Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "payment/refundPayment.handler",
    "Runtime": "nodejs12.x"
  }
  ));
});