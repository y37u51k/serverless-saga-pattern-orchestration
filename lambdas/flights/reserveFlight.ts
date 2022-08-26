// const { DynamoDB } = require('aws-sdk');
const aws = require('aws-sdk');
export {};

exports.handler = async (event:any, context:any, callback:any) => {
  const dynamo = new aws.DynamoDB({
    region: 'ap-northeast-1'
  });

  const stepfunctions = new aws.StepFunctions({
    region: 'ap-northeast-1'
  });

  for(const record of event.Records){

    console.log("request:", JSON.stringify(record.messageBody, undefined, 2));

    let flightReservationID = hashIt(''+record.depart+record.arrive);
    console.log("flightReservationID:",flightReservationID)

    // Pass the parameter to fail this step
    if(record.run_type === 'failFlightsReservation'){
      throw new Error('Failed to book the flights');
    }

    var params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        'pk' : {S: event.trip_id},
        'sk' : {S: flightReservationID},
        'trip_id' : {S: event.trip_id},
        'id': {S: flightReservationID},
        'depart_city' : {S: event.depart_city},
        'depart_time': {S: event.depart_time},
        'arrive_city': {S: event.arrive_city},
        'arrive_time': {S: event.arrive_time},
        'transaction_status': {S: 'pending'}
      }
    };

    let result = dynamo.putItem(params, function (err:any, data:any) {
      if (err) {
        console.error(err.message);
        throw new Error(err);
      } else {
        console.log('inserted flight reservation:');
        console.log(data);
      }
    });

    // // Call DynamoDB to add the item to the table
    // let result = await dynamo.putItem(params).promise().catch((error: any) => {
    //   throw new Error(error);
    // });

    // Create response for calback to stepfunctions
    const messageBody = JSON.parse(record.body);
    const taskToken = messageBody.TaskToken;

    const response = {
      output: flightReservationID,
      taskToken: taskToken
    };

    stepfunctions.sendTaskSuccess(response, (err:any, data:any) => {
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

function hashIt(s:string) {
  let myHash:any;

  for(let i = 0; i < s.length; i++){
    myHash = Math.imul(31, myHash) + s.charCodeAt(i) | 0;
  }

  return '' +Math.abs(myHash);
}