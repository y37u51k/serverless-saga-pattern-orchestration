#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CdkServerlessSagaStack } from '../lib/cdk-serverless-saga-stack';

const app = new cdk.App();
new CdkServerlessSagaStack(app, 'CdkServerlessSagaStack');
