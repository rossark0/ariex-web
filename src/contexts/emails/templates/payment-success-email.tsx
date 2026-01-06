import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';

interface PaymentSuccessEmailProps {
  clientName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  receiptUrl: string;
}

export default function PaymentSuccessEmail({
  clientName,
  amount,
  currency,
  paymentMethod,
  paymentDate,
  receiptUrl,
}: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment received - Thank you</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Received</Heading>
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>We have successfully received your payment.</Text>
          <Text style={text}>
            <strong>Amount:</strong> {currency} ${amount.toFixed(2)}
            <br />
            <strong>Payment Method:</strong> {paymentMethod}
            <br />
            <strong>Date:</strong> {paymentDate}
          </Text>
          <Link href={receiptUrl} style={button}>
            Download Receipt
          </Link>
          <Text style={text}>Thank you for your business!</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const button = {
  backgroundColor: '#18181b',
  borderRadius: '5px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
  marginTop: '16px',
};
