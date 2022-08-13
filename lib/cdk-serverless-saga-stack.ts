import * as cdk from '@aws-cdk/core';
import { StateMachine } from './stateMachine';

export class CdkServerlessSagaStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stateMachine = new StateMachine(this, 'StateMachine');
   
  }
}
