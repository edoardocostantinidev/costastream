use twitch_api::{twitch_oauth2::*, *};
use twitch_irc::{
    login::StaticLoginCredentials, ClientConfig, SecureTCPTransport, TwitchIRCClient,
};

#[tokio::main]
async fn main() {
    let client: TwitchClient<reqwest::Client> = TwitchClient::default();

    let client_id = ClientId::from("5d71pgdc6lgg551kj38e5493dr8d1f");
    let client_secret = ClientSecret::from("zyy4bsqekxa9idaeatk452ngt1rrng");

    let token =
        AppAccessToken::get_app_access_token(&client, client_id, client_secret, Scope::all())
            .await
            .unwrap();

    let config = ClientConfig::default();
    let (mut incoming_messages, client) =
        TwitchIRCClient::<SecureTCPTransport, StaticLoginCredentials>::new(config);

    // first thing you should do: start consuming incoming messages,
    // otherwise they will back up.
    let join_handle = tokio::spawn(async move {
        while let Some(message) = incoming_messages.recv().await {
            dbg!(message);
        }
    });

    // join a channel
    // This function only returns an error if the passed channel login name is malformed,
    // so in this simple case where the channel name is hardcoded we can ignore the potential
    // error with `unwrap`.
    client.join("costadocet".to_owned()).unwrap();

    // keep the tokio executor alive.
    // If you return instead of waiting the background task will exit.
    join_handle.await.unwrap();
}
