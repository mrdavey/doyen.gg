# Doyen.gg MVP

Easily download your twitter follower's details and direct message the most high value active followers.
DM rate limits are managed so you won't go over the limits.

## Prerequisites
 - [Node v12.18.1 (LTS)](https://nodejs.org/en/)
 - npm 6.14.5 (comes with Node.js)

## Setting up your Twitter app
1. Create a [Twitter app](https://developer.twitter.com/en/apps), with the following settings:
   - Give your app a name, e.g. `test app`
   - Add a short description, e.g. `MVP app`
   - Insert a URL (this can be anything), e.g. `https://doyen.gg`
   - Check `Enable Sign in with Twitter`
   - Add `http://localhost:3001/twitterOAuth` to `Callback URLs` (make sure this is exactly the same)
   - Add a short desciption for the last required field. E.g:
    ```
    App will help users to analyse and filter public information about their followers, DM relevant followers, and more effectively engage with subsets of their follower base
    ```
   - Save settings
2. Go to `Permissions` tab of your app
   - Ensure `Read, write, and Direct Messages` is selected
   - Save the permissions
3. Go to `Keys and tokens` tab of your app
   - Make note of the `API key` and `API secret key` (generate them if needed)


## Set up instructions (tested on MacOS)
1. Make sure you have the 'prerequisites' installed
2. Make sure you have set up your Twitter app as above
2. In terminal, navigate to a new folder.
3. Clone this git repo:
    ```
    git clone https://github.com/mrdavey/doyen.gg
    ```
4. Navigate to the `/Backend` directory, edit the `env` file
   - Replace `YOUR_TWITTER_APP_API_KEY` with your Twitter API key
   - Replace `YOUR_TWITTER_APP_API_SECRET_KEY` with your Twitter API secret key
5. Rename the `env` to `.env` (i.e. add a period to the front of the filename)
6. In your terminal, make sure you are in the `/Backend` directory
7. Run the following commands:
    ```
    npm install
    npm start
    ```
8. When it is all set up and ready, you will see a message with a timestamp and: 
    ```
    💬 Log: Listening on http://localhost:3001
    ```
9. In your browser, go to `http://localhost:3001` and follow the instructions.

## Things to consider
 - The `env` file has a `LOCAL_FOLLOWER_LIMIT` value of `100000`. You can increase or reduce this, depending on the time you have to test this. E.g. if you have more than 500k followers, then it will take approximately 100 minutes (~83 followers per second) to fully download your followers, within the rate limits. If you want to do this, then increase the `LOCAL_FOLLOWER_LIMIT` to above 500k. 
 - If you have less than 75k followers, then it will take approx. 15min without any changes to `LOCAL_FOLLOWER_LIMIT`.
 - Sending of DMs is set to 'cold run' by default, which means they won't actually get sent. Only if you untick the 'cold run' option, then they will actually be sent to the selected IDs.
 - There are more filtering and sorting options within the code. If you know what you are doing then you can easily change them in the `routes/index.js` file under the `/filter` route.
