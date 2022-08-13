import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
// import * as sns from "@aws-cdk/aws-sns";
// import * as subscriptions from "@aws-cdk/aws-sns-subscriptions";
import dynamodb = require('@aws-cdk/aws-dynamodb');
import apigw = require('@aws-cdk/aws-apigateway');



export class StateMachine extends cdk.Construct {
  public Machine: sfn.StateMachine;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    /**
     * Create Dynamo DB tables which holds flights and car rentals reservations as well as payments information
     */
    const flightTable = new dynamodb.Table(this,'Flights',{
        partitionKey:{name:'pk', type:dynamodb.AttributeType.STRING},
        sortKey:{name:'sk', type: dynamodb.AttributeType.STRING}
      })

      const rentalTable = new dynamodb.Table(this,'Rentals',{
        partitionKey:{name:'pk', type:dynamodb.AttributeType.STRING},
        sortKey:{name:'sk', type: dynamodb.AttributeType.STRING}
      })

      const paymentTable = new dynamodb.Table(this,'Payments',{
        partitionKey:{name:'pk', type:dynamodb.AttributeType.STRING},
        sortKey:{name:'sk', type: dynamodb.AttributeType.STRING}
      })
  
      /**
       * Create Lambda Functions for booking and cancellation of services.
       */
  
       // Flights 
      let reserveFlightLambda = this.createLambda(this, 'reserveFlightLambdaHandler', 'flights/reserveFlight.handler', flightTable);
      let confirmFlightLambda = this.createLambda(this, 'confirmFlightLambdaHandler', 'flights/confirmFlight.handler', flightTable);
      let cancelFlightLambda = this.createLambda(this, 'cancelFlightLambdaHandler', 'flights/cancelFlight.handler', flightTable);
  
      // Car Rentals 
      let reserveRentalLambda = this.createLambda(this, 'reserveRentalLambdaHandler', 'rentals/reserveRental.handler', rentalTable);
      let confirmRentalLambda = this.createLambda(this, 'confirmRentalLambdaHandler', 'rentals/confirmRental.handler', rentalTable);
      let cancelRentalLambda = this.createLambda(this, 'cancelRentalLambdaHandler', 'rentals/cancelRental.handler', rentalTable);
  
      // Payment 
      let processPaymentLambda = this.createLambda(this, 'processPaymentLambdaHandler', 'payment/processPayment.handler', paymentTable);
      let refundPaymentLambda = this.createLambda(this, 'refundPaymentLambdaHandler', 'payment/refundPayment.handler', paymentTable);

      /**
     * Saga Pattern StepFunction
     * 1) Reserve Flight
     * 2) Reserve Car Rental
     * 2) Take Payment
     * 3) Confirm Flight and Car Rental reservation
     */

    

    // final states - success or failure 
    const reservationFailed = new sfn.Fail(this, "Reservation Failed", {error: 'Job Failed'});
    const reservationSucceeded = new sfn.Succeed(this, "Reservation Successful!");
    
    // // SNS Topic, Subscription configuration
    //
    // const topic = new  sns.Topic(this, 'Topic');
    // topic.addSubscription(new subscriptions.SmsSubscription('+11111111111'));
    // const snsNotificationFailure = new tasks.SnsPublish(this ,'SendingSMSFailure', {
    //   topic:topic,
    //   integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
    //   message: sfn.TaskInput.fromText('Your Travel Reservation Failed'),
    // });
    //
    // const snsNotificationSuccess = new tasks.SnsPublish(this ,'SendingSMSSuccess', {
    //   topic:topic,
    //   integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
    //   message: sfn.TaskInput.fromText('Your Travel Reservation is Successful'),
    // });


    /**
     * Reserve Flights 
     */
    
    const cancelFlightReservation = new tasks.LambdaInvoke(this, 'CancelFlightReservation', {
        lambdaFunction: cancelFlightLambda,
        resultPath: '$.CancelFlightReservationResult',
      }).addRetry({maxAttempts:3})
      // .next(snsNotificationFailure) // retry this task a max of 3 times if it fails
      .next(reservationFailed);
  
      const reserveFlight = new tasks.LambdaInvoke(this, 'ReserveFlight', {
        lambdaFunction: reserveFlightLambda,
        resultPath: '$.ReserveFlightResult',
      }).addCatch(cancelFlightReservation, {
        resultPath: "$.ReserveFlightError"
      });

      /**
     * Reserve Car Rentals
     */
    
    const cancelRentalReservation = new tasks.LambdaInvoke(this, 'CancelRentalReservation', {
        lambdaFunction:cancelRentalLambda,
        resultPath: '$.CancelRentalReservationResult',
      }).addRetry({maxAttempts:3}) // retry this task a max of 3 times if it fails
      .next(cancelFlightReservation);
  
      const reserveCarRental = new tasks.LambdaInvoke(this, 'ReserveCarRental', {
        lambdaFunction:reserveRentalLambda,
        resultPath: '$.ReserveCarRentalResult',
      }).addCatch(cancelRentalReservation, {
        resultPath: "$.ReserveCarRentalError"
      });
      
      /**
       * Payment
       */
      const refundPayment = new tasks.LambdaInvoke(this, 'RefundPayment', {
        lambdaFunction:refundPaymentLambda,
        resultPath: '$.RefundPaymentResult',
      }).addRetry({maxAttempts:3}) // retry this task a max of 3 times if it fails
      .next(cancelRentalReservation);
  
      const processPayment = new tasks.LambdaInvoke(this, 'ProcessPayment', {
        lambdaFunction:processPaymentLambda,
        resultPath: '$.ProcessPaymentResult',
      }).addCatch(refundPayment, {
        resultPath: "$.ProcessPaymentError"
      });
  
      /**
       * Confirm Flight and Car Rental reservation
       */
  
      const confirmFlight = new tasks.LambdaInvoke(this, 'ConfirmFlight', {
        lambdaFunction:confirmFlightLambda,
        resultPath: '$.ConfirmFlightResult',
      }).addCatch(refundPayment, {
        resultPath: "$.ConfirmFlightError"
      });
  
      const confirmCarRental = new sfn.Task(this, 'ConfirmCarRental', {
        task: new tasks.RunLambdaTask(confirmRentalLambda),
        resultPath: '$.ConfirmCarRentalResult',
      }).addCatch(refundPayment, {
        resultPath: "$.ConfirmCarRentalError"
      });
  
      //Step function definition
      const definition = sfn.Chain
      .start(reserveFlight)
      .next(reserveCarRental)
      .next(processPayment)
      .next(confirmFlight)
      .next(confirmCarRental)
      // .next(snsNotificationSuccess)
      .next(reservationSucceeded)
  
   
      let saga = new sfn.StateMachine(this, "StateMachine", {
      definition,

    });

    // AWS Lambda resource to connect to our API Gateway to kick
    // off our step function
    const sagaLambda = new lambda.Function(this, 'sagaLambdaHandler', {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset('lambdas'),
        handler: 'sagaLambda.handler',
        environment: {
          statemachine_arn: saga.stateMachineArn
        }
      });
  
      saga.grantStartExecution(sagaLambda);
  
      /**
       * Simple API Gateway proxy integration
       */
    
      new apigw.LambdaRestApi(this, 'ServerlessSagaPattern', {
        handler: sagaLambda
      });
  

  }

/**
     * Utility method to create Lambda blueprint
     * @param scope 
     * @param id 
     * @param handler 
     * @param table 
     */
    createLambda(scope:cdk.Construct, id:string, handler:string, table:dynamodb.Table){
    
        // Create a Lambda with the table name passed in as variable
        let fn =  new lambda.Function(scope, id, {
          runtime: lambda.Runtime.NODEJS_12_X,
          code: lambda.Code.fromAsset('lambdas'),
          handler:handler,
          environment: {
            TABLE_NAME: table.tableName
          }
        });
  
        // Give Lambda permissions to read and write data from the DynamoDB table
        table.grantReadWriteData(fn);
    
        return fn;
      }
}
