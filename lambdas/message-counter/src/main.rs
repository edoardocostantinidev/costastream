use aws_lambda_events::event::sns::SnsEvent;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::Deserialize;
use tracing::{error, info};

#[derive(Deserialize)]
#[serde(tag = "event_type", rename_all = "snake_case")]
enum Detail {
    #[serde(rename = "chat_message_received")]
    ChatMessageReceived(ChatMessageReceivedData),
}

#[derive(Deserialize)]
struct ChatMessageReceivedData {
    sender: String,
    message: String,
    sent_date: i64,
}

#[derive(Deserialize)]
struct SnsMessage {
    version: String,
    id: String,
    #[serde(rename = "detail-type")]
    detail_type: String,
    source: String,
    account: String,
    time: String,
    region: String,
    resources: Vec<String>,
    pub detail: Detail,
}

async fn function_handler(event: LambdaEvent<SnsEvent>) -> Result<(), Error> {
    event.payload.records.iter().for_each(|record| {
        let sns_message: Result<SnsMessage, _> = serde_json::from_str(record.sns.message.as_str());
        match sns_message {
            Ok(SnsMessage {
                detail:
                    Detail::ChatMessageReceived(ChatMessageReceivedData {
                        sender,
                        sent_date,
                        message,
                    }),
                ..
            }) => {
                info!("Received a message sent by {sender} on {sent_date} with content: {message}")
            }
            Err(e) => error!("Error while parsing:{:?} data: {:?}", e, record.sns.message),
        }
    });

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}
