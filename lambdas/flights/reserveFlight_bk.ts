console.log('Loading function');
const aws = require('aws-sdk');

exports.handler = (event:any, context:any, callback:any) => {
  const stepfunctions = new aws.StepFunctions({
      region: 'ap-northeast-1'
  });

  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    const taskToken = messageBody.TaskToken;

    const params = {
      output: "\"Callback task completed successfully.\"",
      taskToken: taskToken
    };

    console.log(`Calling Step Functions to complete callback task with params ${JSON.stringify(params)}`);

    stepfunctions.sendTaskSuccess(params, (err:any, data:any) => {
      if (err) {
        console.error(err.message);
        callback(err.message);
        return;
      }
      console.log(data);
      callback(null);
    });
  }
};