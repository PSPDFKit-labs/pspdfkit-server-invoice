const axios = require("axios");

const documentId = "invoice";
const templateLayerName = "invoice-template";

const invoiceNumberAnnotationId = "invoice-number";
const customerDetailsAnnotationId = "customer-details";

const layout = {
  margin: 30,
  table: {
    columnMargin: 20,
    rowHeight: 35,
    columns: [
      { space: 0.4 },
      { space: 0.1 },
      { space: 0.2, style: { horizontalAlign: "right" } },
      { space: 0.3 },
    ],
  },
};

const http = axios.create({
  baseURL: `http://localhost:${process.env.SERVER_PORT}/api/`,
  headers: { Authorization: `Token token=${process.env.SERVER_API_AUTH_TOKEN}` },
});

const getPageDimensions = () =>
  http.get(`/documents/${documentId}/document_info`).then(
    (response) =>
      new Promise((resolve) => {
        layout.pageWidth = response.data.data.pages[0].width;
        layout.pageHeight = response.data.data.pages[0].height;
        resolve();
      })
  );

const calculateTableDimensions = () =>
  new Promise((resolve) => {
    layout.table.width = layout.pageWidth - 2 * layout.margin;
    let columns = [];
    layout.table.columns.reduce((left, column, index) => {
      const totalColumnWidth = column.space * layout.table.width;
      if (index === 0) {
        column.width = totalColumnWidth - layout.table.columnMargin;
        column.left = left;
      } else if (index === layout.table.columns.length - 1) {
        column.width = totalColumnWidth - layout.table.columnMargin;
        column.left = left + layout.table.columnMargin;
      } else {
        column.width = totalColumnWidth - 2 * layout.table.columnMargin;
        column.left = left + layout.table.columnMargin;
      }
      columns.push(column);
      return left + totalColumnWidth;
    }, layout.margin);
    layout.table.columns = columns;
    resolve();
  });

const createAnnotation = (layerName, id, content) => {
  const annotation = { id, content };
  return http.post(
    `/documents/${documentId}/layers/${layerName}/annotations`,
    annotation
  );
};

const createTextAnnotation = (layerName, id, properties) => {
  content = {
    v: 1,
    type: "pspdfkit/text",
    pageIndex: 0,
    opacity: 1,
    font: "Arial",
    fontSize: 12,
    fontColor: "#000000",
    horizontalAlign: "left",
    verticalAlign: "top",
    ...properties,
  };
  return createAnnotation(layerName, id, content);
};

const addHr = (layerName, top) => {
  const content = {
    v: 1,
    type: "pspdfkit/shape/line",
    pageIndex: 0,
    bbox: [layout.margin, top, layout.pageWidth - 2 * layout.margin, 5],
    opacity: 1,
    startPoint: [layout.margin, top],
    endPoint: [layout.pageWidth - layout.margin, top],
    strokeWidth: 1,
    strokeColor: "#000000",
  };
  return createAnnotation(layerName, `ht-${top}`, content);
};

const addRow = (layerName, contents, top, options) => {
  options = { ruler: true, ...options };
  const requests = contents.map((content, index) => {
    const column = layout.table.columns[index];
    return createTextAnnotation(layerName, `row-${top}-column-${index}`, {
      text: content.toString(),
      bbox: [column.left, top, column.width, layout.table.rowHeight],
      fontSize: 12,
      horizontalAlign: "left",
      verticalAlign: "center",
      ...column.style,
      ...options.style,
    });
  });

  return Promise.all(requests).then((_) => {
    if (options.ruler) {
      return addHr(layerName, top + layout.table.rowHeight - 5);
    }
  });
};

module.exports = {
  addHr,
  addRow,
  calculateTableDimensions,
  createTextAnnotation,
  getPageDimensions,
  http,
  layout,
  customerDetailsAnnotationId,
  documentId,
  invoiceNumberAnnotationId,
  templateLayerName,
};
