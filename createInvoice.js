const fs = require("fs");
const {
  addRow,
  customerDetailsAnnotationId,
  calculateTableDimensions,
  documentId,
  getPageDimensions,
  http,
  invoiceNumberAnnotationId,
  layout,
  templateLayerName,
} = require("./common");

const createLayer = (layerName) => {
  const payload = {
    name: layerName,
    source_layer_name: templateLayerName,
  };

  return http.post(`/documents/${documentId}/layers`, payload);
};

const updateAnnotation = (layerName, annotationId, updates) => {
  const path = `/documents/${documentId}/layers/${layerName}/annotations/${annotationId}`;
  return http.get(path).then((response) => {
    const { content } = response.data;
    const updatedContent = { ...content, ...updates };

    return http.put(path, { id: annotationId, content: updatedContent });
  });
};

const setInvoiceNumber = (layerName, invoiceNumber) =>
  updateAnnotation(layerName, invoiceNumberAnnotationId, {
    text: `Invoice #${invoiceNumber}`,
  });

const setCustomerDetails = (layerName, customerDetails) =>
  updateAnnotation(layerName, customerDetailsAnnotationId, { text: customerDetails });

const addItems = (layerName, items, start) => {
  const requests = items.map(({ name, unitCost, quantity }, index) => {
    const top = start + layout.table.rowHeight * index;
    return addRow(
      layerName,
      [name, quantity, unitCost.toFixed(2), (unitCost * quantity).toFixed(2)],
      top
    );
  });

  return Promise.all(requests).then(
    new Promise((resolve) => {
      layout.endOfItemsTable = start + layout.table.rowHeight * items.length;
    })
  );
};

const addSummary = (layerName, items) => {
  const subtotal = items.reduce(
    (acc, item) => acc + item.unitCost * item.quantity,
    0
  );
  const vat = subtotal * 0.23;
  const total = subtotal + vat;

  const start = layout.endOfItemsTable + 10;

  return Promise.all([
    addRow(layerName, ["", "", "Subtotal", subtotal.toFixed(2)], start, {
      ruler: false,
    }),
    addRow(layerName, ["", "", "VAT", vat.toFixed(2)], start + 20, {
      ruler: false,
    }),
    addRow(layerName, ["", "", "Total", total.toFixed(2)], start + 40, {
      ruler: false,
      style: { fontSize: 13, fontStyle: ["bold"] },
    }),
  ]);
};
const downloadInvoice = (layerName, filename) => {
  return http
    .get(`/documents/${documentId}/layers/${layerName}/pdf?flatten=true`, {
      responseType: "stream",
    })
    .then((response) =>
      response.data.pipe(fs.createWriteStream("invoice.pdf"))
    );
};

const invoice = JSON.parse(fs.readFileSync("./invoice.json"));
const layerName = invoice.number;

createLayer(layerName)
  .then(() => setInvoiceNumber(layerName, invoice.number))
  .then(() => setCustomerDetails(layerName, invoice.customer))
  .then(getPageDimensions)
  .then(calculateTableDimensions)
  .then(() => addItems(layerName, invoice.items, 455))
  .then(() => addSummary(layerName, invoice.items))
  .then(() => downloadInvoice(layerName, "invoice.pdf"))
  .catch((err) => console.log(err));
