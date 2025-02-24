import { t, Trans } from "@lingui/macro";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ReactNode, useCallback, useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";
import { useHistory } from "react-router";

import { formatCents, formatDate, formatRelative } from "../lib/helpers";
import {
  createSubscription,
  queryClient,
  useOrderHistory,
} from "../lib/queries";
import { supabase } from "../lib/supabaseClient";
import { Box, Type, TypeProps } from "../slang";
import { AppContext } from "./AppContext";
import Loading from "./Loading";
import { Button, Dialog, Notice, Page, Section, SectionTitle } from "./Shared";
import Spinner from "./Spinner";
import styles from "./SponsorDashboard.module.css";

export function SponsorDashboard() {
  const { customer, session, customerIsLoading } = useContext(AppContext);
  const [cancelModal, setCancelModal] = useState(false);
  const [resumeModal, setResumeModal] = useState(false);
  const { push } = useHistory();
  const signOut = useCallback(() => {
    (async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.removeQueries(["auth"]);
      push("/");
    })();
  }, [push]);
  const { data: invoices = [] } = useOrderHistory(
    customer?.customerId,
    customer?.subscription?.id
  );
  const subscription = customer?.subscription;

  if (customerIsLoading) return <Loading />;

  return (
    <Page
      px={4}
      py={8}
      content="start normal"
      className={styles.Wrapper}
      self="stretch center"
    >
      <Section>
        <SectionTitle>
          <Trans>User</Trans>
        </SectionTitle>
        <Type>{session?.user?.email}</Type>
        <Button self="start" onClick={signOut} text={t`Log Out`} />
      </Section>
      {subscription?.status === "canceled" && (
        <Section>
          <SectionTitle>
            <Trans>Become a Sponsor</Trans>
          </SectionTitle>
          <Type>
            <Trans>
              Your subscription is no longer active. If you want to create and
              edit hosted charts become a sponsor.
            </Trans>
          </Type>
          <BecomeASponsor />
        </Section>
      )}
      <Section>
        <SectionTitle>
          <Trans>Subscription</Trans>
        </SectionTitle>
        <Box gap={2}>
          <Box>
            <InfoHeading>
              <Trans>Status</Trans>
            </InfoHeading>
            <InfoCell>{subscription?.status}</InfoCell>
          </Box>
          {subscription?.current_period_end &&
            !subscription?.cancel_at_period_end &&
            subscription?.status === "active" && (
              <Box>
                <InfoHeading>
                  <Trans>Next charge</Trans>
                </InfoHeading>
                <InfoCell>
                  {formatDate(subscription?.current_period_end.toString())}
                </InfoCell>
              </Box>
            )}
          {!subscription?.cancel_at_period_end &&
            subscription?.created &&
            subscription?.status === "active" && (
              <Box>
                <InfoHeading>
                  <Trans>Start</Trans>
                </InfoHeading>
                <InfoCell>
                  {formatRelative(subscription.created.toString())}
                </InfoCell>
              </Box>
            )}
        </Box>
        {subscription?.cancel_at_period_end && (
          <Box flow="column" content="start" gap={4}>
            <Notice>
              <Trans>Subscription will end</Trans>{" "}
              {formatDate(subscription.current_period_end.toString())}
            </Notice>
            <Button
              onClick={() => setResumeModal(true)}
              text={t`Resume Subscription`}
            />
          </Box>
        )}
      </Section>
      {!subscription?.cancel_at_period_end &&
        subscription?.created &&
        subscription?.status === "active" && (
          <Section>
            <SectionTitle>
              <Trans>Cancel</Trans>
            </SectionTitle>
            <Type>
              <Trans>
                Cancel your subscription. Your hosted charts will become
                read-only.
              </Trans>
            </Type>
            <Button
              self="normal start"
              onClick={() => setCancelModal(true)}
              text={t`Cancel`}
            />
          </Section>
        )}
      <Section>
        <SectionTitle>
          <Trans>History</Trans>
        </SectionTitle>
        <Box as="table" className={styles.InvoicesTable} rad={1}>
          <colgroup>
            <col width="50%" />
            <col width="50%" />
          </colgroup>
          <thead>
            <tr>
              <Td typeProps={{ size: -1 }}>
                <Trans>Date</Trans>
              </Td>
              <Td typeProps={{ size: -1 }}>
                <Trans>Amount</Trans>
              </Td>
            </tr>
          </thead>
          <tbody>
            {invoices &&
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <Td>{formatDate(invoice.created.toString())}</Td>
                  <Td>{formatCents(invoice.amount_paid)}</Td>
                </tr>
              ))}
          </tbody>
        </Box>
      </Section>
      <ConfirmCancel
        isOpen={cancelModal}
        onDismiss={() => setCancelModal(false)}
      />
      <ConfirmResume
        isOpen={resumeModal}
        onDismiss={() => setResumeModal(false)}
      />
    </Page>
  );
}

const Td = ({
  children,
  typeProps = {},
}: {
  children: ReactNode;
  typeProps?: TypeProps;
}) => (
  <Box as="td" px={3} py={2} display="table-cell" className={styles.TableCell}>
    <Type as="span" size={-1} {...typeProps}>
      {children}
    </Type>
  </Box>
);

function ConfirmCancel({
  isOpen,
  onDismiss,
}: {
  isOpen: boolean;
  onDismiss: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { customer } = useContext(AppContext);
  async function cancelSubscription() {
    if (customer?.subscription) {
      setLoading(true);
      await fetch("/api/cancel-subscription", {
        method: "post",
        body: JSON.stringify({ subscriptionId: customer.subscription.id }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      queryClient.invalidateQueries(["auth", "customerInfo"]);
      setLoading(false);
      onDismiss();
    }
  }
  return (
    <Dialog
      dialogProps={{
        isOpen,
        onDismiss,
        "aria-label": t`Cancel`,
      }}
      innerBoxProps={{ gap: 6 }}
    >
      <Type>
        <Trans>Do you want to cancel your subscription?</Trans>
      </Type>
      <Box content="normal space-between" flow="column" gap={3}>
        <Button onClick={onDismiss} disabled={loading} text={t`Return`} />
        <Button
          disabled={loading}
          onClick={cancelSubscription}
          text={t`Cancel`}
        />
      </Box>
      {loading && <Spinner />}
    </Dialog>
  );
}

function ConfirmResume({
  isOpen,
  onDismiss,
}: {
  isOpen: boolean;

  onDismiss: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { customer } = useContext(AppContext);
  if (!customer?.subscription?.current_period_end) return null;
  const period = customer.subscription.current_period_end.toString();
  async function resumeSubscription() {
    setLoading(true);
    await fetch("/api/resume-subscription", {
      method: "post",
      body: JSON.stringify({ subscriptionId: customer?.subscription?.id }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    queryClient.invalidateQueries(["auth", "customerInfo"]);
    setLoading(false);
    onDismiss();
  }
  return (
    <Dialog
      dialogProps={{ isOpen, onDismiss, "aria-label": t`Resume Subscription` }}
      innerBoxProps={{ gap: 4 }}
    >
      <Type as="p">
        <Trans>Resume Subscription</Trans>
        <br />
        <Trans>Next charge</Trans> {formatDate(period)}.
      </Type>
      <Box content="normal space-between" flow="column" gap={3}>
        <Button onClick={onDismiss} disabled={loading} text={t`Cancel`} />
        <Button
          disabled={loading}
          onClick={resumeSubscription}
          text={t`Resume Subscription`}
        />
      </Box>
      {loading && <Spinner />}
    </Dialog>
  );
}

function BecomeASponsor() {
  const stripe = useStripe();
  const elements = useElements();
  const { customer, theme } = useContext(AppContext);
  const { handleSubmit } = useForm();
  const submit = useMutation("becomeASponsor", async () => {
    if (!stripe || !elements || !customer?.customerId) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) throw new Error("No Card Element Found");

    const { error: createPaymentError, paymentMethod } =
      await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });
    if (createPaymentError) throw createPaymentError;
    if (!paymentMethod) throw new Error("No Payment Method");
    const { error: createSubscriptionError } = await createSubscription({
      customerId: customer.customerId,
      paymentMethodId: paymentMethod.id,
      subscriptionType: "monthly", // Need to fix this
    });
    if (createSubscriptionError) throw createSubscriptionError;
    queryClient.resetQueries(["auth"]);
  });
  return (
    <Box
      as="form"
      onSubmit={handleSubmit(() => submit.mutate())}
      template="none / minmax(0, 1fr) auto auto"
      content="normal start"
      flow="column"
      gap={2}
    >
      <Box p={2} px={3} rad={1} className={styles.CardEl}>
        <CardElement
          options={{
            style: {
              base: {
                color: theme.foreground,
                backgroundColor: theme.background,
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                fontSize: "16px",
              },
            },
          }}
        />
      </Box>
      <Button type="submit">Subscribe</Button>
      {submit.isLoading ? <Spinner /> : <div />}
    </Box>
  );
}

function InfoCell({ children }: { children: ReactNode }) {
  return <Type className={styles.InfoCell}>{children}</Type>;
}

function InfoHeading({ children }: { children: ReactNode }) {
  return (
    <Type className={styles.InfoHeading} size={-1} color="color-lineNumbers">
      {children}
    </Type>
  );
}
