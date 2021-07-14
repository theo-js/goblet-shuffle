const pushRouter = require('express').Router();
const webPush = require('web-push');
const { DOMAIN } = require('../../constants');
const getIP = require('../../utils/getIP').getIPFromHttpReq;

const VAPID_KEYS = webPush.generateVAPIDKeys();
global.subscriptions = {};

pushRouter.get('/key', (req, res) => {
    res.status(200).json(VAPID_KEYS.publicKey);
});

pushRouter.post('/subscribe', (req, res) => {
    const subscriptionRequest = req.body;
    const ip = getIP(req);
    global.subscriptions[ip] = subscriptionRequest;
});

function getSubscription (ip) {
    return global.subscriptions[ip];
}

async function sendPushNotif (ip, payload) {
    try {
        const subscription = getSubscription(ip);
        if (!subscription) {
            throw new Error('Cannot send notifications to this user because they have not subscribed');
        }

        const options = {
            vapidDetails: {
                ...VAPID_KEYS,
                subject: process.env.VAPID_DETAILS_SUBJECT
            }
        }

        await webPush.sendNotification(
            subscription,
            payload,
            options,
        );

        return true;
    } catch (err) {
        console.log(err)
        delete global.subscriptions[ip]; // Unregister user
        return false;
    }
}

module.exports = {
    pushRouter,
    VAPID_KEYS,
    getSubscription,
    sendPushNotif
}