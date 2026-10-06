'use client';

export type LabelPaperSize = '52mm' | '88mm';
export type ReceiptPaperSize = '58mm' | '80mm';

export interface LabelPrintConfig {
  mostrar_codigo: boolean;
  mostrar_codigo_barras: boolean;
  mostrar_preco_custo: boolean;
  fonte_tamanho: 'pequeno' | 'medio' | 'grande';
  cor_primaria: string;
}

export interface ReceiptPrintConfig {
  mostrar_logo: boolean;
  mostrar_cnpj: boolean;
  mostrar_endereco: boolean;
  mensagem_rodape: string;
  mostrar_codigo_barras: boolean;
}

export const DEFAULT_LABEL_PRINT_CONFIG: LabelPrintConfig = {
  mostrar_codigo: true,
  mostrar_codigo_barras: true,
  mostrar_preco_custo: false,
  fonte_tamanho: 'medio',
  cor_primaria: '#16a34a',
};

export const DEFAULT_RECEIPT_PRINT_CONFIG: ReceiptPrintConfig = {
  mostrar_logo: false,
  mostrar_cnpj: true,
  mostrar_endereco: true,
  mensagem_rodape: 'Obrigado pela preferência!',
  mostrar_codigo_barras: false,
};

interface ThermalPrintOptions {
  title: string;
  widthMm: number;
}

const waitForImages = (printDocument: Document) => Promise.all(
  Array.from(printDocument.images).map((image) => {
    if (image.complete) return Promise.resolve();

    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  })
);

const waitForStylesheets = (printDocument: Document) => Promise.all(
  Array.from(printDocument.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map((link) => {
    if (link.sheet) return Promise.resolve();

    return new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
  })
);

const nextPaint = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

const loadingTimeout = (milliseconds: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

/**
 * Prints only the supplied element in an isolated, same-origin iframe.
 * This avoids pop-up blockers and prevents the dashboard chrome from being
 * included in receipts or labels.
 */
export async function printThermalElement(
  element: HTMLElement,
  { title, widthMm }: ThermalPrintOptions
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('A impressão só está disponível no navegador.');
  }

  const printFrame = document.createElement('iframe');
  printFrame.title = 'Área de impressão térmica';
  printFrame.setAttribute('aria-hidden', 'true');
  Object.assign(printFrame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(printFrame);

  const printWindow = printFrame.contentWindow;
  const printDocument = printFrame.contentDocument;

  if (!printWindow || !printDocument) {
    printFrame.remove();
    throw new Error('Não foi possível criar o documento de impressão.');
  }

  const applicationStyles = Array.from(
    document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]')
  ).map((node) => node.outerHTML).join('\n');

  printDocument.open();
  printDocument.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base href="${escapeHtml(document.baseURI)}" />
        <title>${escapeHtml(title)}</title>
        ${applicationStyles}
        <style>
          @page { margin: 0; }
          html, body {
            width: ${widthMm}mm !important;
            min-width: ${widthMm}mm !important;
            max-width: ${widthMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            color: #000 !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #thermal-print-root {
            width: ${widthMm}mm !important;
            max-width: ${widthMm}mm !important;
            margin: 0 !important;
          }
          @media print {
            html, body, #thermal-print-root {
              width: ${widthMm}mm !important;
              max-width: ${widthMm}mm !important;
            }
          }
        </style>
      </head>
      <body><main id="thermal-print-root">${element.outerHTML}</main></body>
    </html>`);
  printDocument.close();

  try {
    await Promise.race([
      Promise.all([
        waitForStylesheets(printDocument),
        waitForImages(printDocument),
        printDocument.fonts?.ready ?? Promise.resolve(),
      ]).then(() => undefined),
      loadingTimeout(3_000),
    ]);
    await nextPaint();

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      window.setTimeout(() => printFrame.remove(), 100);
    };

    printWindow.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    printFrame.remove();
    throw error;
  }
}
