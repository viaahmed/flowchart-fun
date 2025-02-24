import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_KEY);

const defaultErrorMessage = "Unable to Sign In. Are you a sponsor?";

/* Returns whether an email has a subscription */
export default async function handler(req, res) {
  try {
    const { email } = req.body;
    if (!email) throw new Error(defaultErrorMessage);

    // Check if a customer exists with that email
    const { data: customers } = await stripe.customers.list({ email });
    if (!customers.length) throw new Error(defaultErrorMessage);

    let customer = customers[0].id;

    // Check if email has a subscription
    const { data: subscriptions } = await stripe.subscriptions.list({
      customer,
      status: "all",
      price: process.env.STRIPE_PRICE_ID,
    });
    const { data: yearlySubscription } = await stripe.subscriptions.list({
      customer,
      status: "all",
      price: process.env.STRIPE_PRICE_ID_YEARLY,
    });
    if (!subscriptions.length && !yearlySubscription.length)
      throw new Error(defaultErrorMessage);

    res.json({ subscription: "found" });
  } catch (error) {
    let message = error.message;
    switch (message) {
      case "An error occurred with our connection to Stripe.":
        message = "A connection error occured";
        break;
    }
    return res.status("400").send({ error: { message: error.message } });
  }
}
