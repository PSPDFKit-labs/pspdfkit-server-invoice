## Creating invoice with PSPDFKit Server

This is a small project in Node.js which creates invoices from a template using [PSPDFKit Server](https://pspdfkit.com/guides/server/current/pspdfkit-server/overview/).

See the accompanying blog post at https://pspdfkit.com/blog/2020/creating-invoices-with-pspdfkit-server-part-1/.

### How-to

Written with Node.js 12.8.3. To use it, clone the repository and run

```bash
npm install
export SERVER_PORT=5000 # Local port PSPDFKit Server will listen on.
export SERVER_API_AUTH_TOKEN=secret # Authentication token used by Server API.
export ACTIVATION_KEY=... # Your Server activation key.
docker-compose up -d
```

After that, you can create the invoice template by running `node createTemplate.js`.
In order to generate an invoice, run `node createInvoice.js` - the resulting PDF file will be saved at `./invoice.pdf`.
You can modify the invoice data in `invoice.json` file to see a different result.
