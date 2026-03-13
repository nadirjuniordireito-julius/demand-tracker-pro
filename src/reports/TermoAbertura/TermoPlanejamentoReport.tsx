const defaultLogoIbama = `${typeof window !== 'undefined' ? window.location.origin : ''}/ibama.jpg`;
const defaultLogoUfla = `${typeof window !== 'undefined' ? window.location.origin : ''}/ufla1.png`;

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { useTranslation } from "react-i18next";

export type TPELabels = {
  documentTitle: string;
  demandNumber: string;
  planningDate: string;
  specification: string;
  schedule: string;
  expectedResult: string;
  costs: string;
  signature: string;
  signatureNote: string;
  signerName: string;
  signerRole: string;
  pageOf: (page: number, total: number) => string;
};

export type CustoItem = {
  perfil: string;
  horas: number;
  valorHora: number;
};

export type TPEProps = {
  PROJETO_COD_TED: string;
  PROJETO_NOME: string;
  DEMANDA_CODIGO: string;
  DATA_ABERTURA: string;
  ESPECIFICACAO: string;
  CRONOGRAMA: string;
  RESULTADO_ESPERADO: string;
  CUSTOS_DETALHADOS: CustoItem[];
  totalGeral: number;
  /** URL do logo Ibama (se omitido, usa /ibama.jpg na origin) */
  logoIbama?: string;
  /** URL do logo UFLA (se omitido, usa /ufla1.png na origin; use import de asset para PDF) */
  logoUfla?: string;
  /** Quando fornecidas (ex.: geração via service sem contexto i18n), substituem t() */
  labels?: TPELabels;
};

/** Props do componente puro: sem hooks, para uso em pdf() no service */
export type TPEPropsWithLabels = Omit<TPEProps, "labels"> & { labels: TPELabels };

const styles = StyleSheet.create({
  page: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    position: "absolute",
    top: 25,
    left: 40,
    right: 40,
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    height: 45,
    width: "auto",
  },
  headerCenter: {
    textAlign: "center",
    flex: 1,
  },
  headerLine: {
    position: "absolute",
    top: 85,
    left: 40,
    right: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 130,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: "bold",
  },
  box: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#000",
    padding: 8,
    marginBottom: 12,
  },
  assinatura: {
    marginTop: 30,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#444",
  },
  table: { width: "100%", borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  cellHeader: {
    flex: 1,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 4,
    backgroundColor: "#eee",
    textAlign: "center",
  },
  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 4,
    textAlign: "center",
    fontSize: 9,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: "justify",
  },
});

/**
 * Componente puro sem hooks: para uso em pdf() no termoService.
 * Não usa useTranslation (evita erro "useSyncExternalStore is not a function" no contexto do react-pdf).
 */
export function TermoPlanejamentoReportInner(props: TPEPropsWithLabels) {
  const {
    PROJETO_COD_TED,
    PROJETO_NOME,
    DEMANDA_CODIGO,
    DATA_ABERTURA,
    ESPECIFICACAO,
    CRONOGRAMA,
    RESULTADO_ESPERADO,
    CUSTOS_DETALHADOS,
    totalGeral,
    logoIbama = defaultLogoIbama,
    logoUfla = defaultLogoUfla,
    labels: L,
  } = props;

  const moeda = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const normalizeRichText = (input: string): string => {
    if (!input) return "";

    let text = input;

    // Normaliza quebras de linha de Windows
    text = text.replace(/\r\n/g, "\n");
    // Converte quebras HTML básicas em \n
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/li>/gi, "\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    // Remove demais tags HTML
    text = text.replace(/<\/?[^>]+>/g, "");
    
    return text;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Image src={logoIbama} style={styles.logo} />
          <View style={styles.headerCenter}>
            <Text>{PROJETO_COD_TED}</Text>
            <Text>{PROJETO_NOME}</Text>
          </View>
          <Image src={logoUfla} style={styles.logo} />
        </View>

        <View style={styles.headerLine} fixed />

        <Text style={styles.title}>{L.documentTitle}</Text>

        <View style={styles.labelRow}>
          <Text style={styles.label}>{L.demandNumber}</Text>
          <Text style={styles.value}>{DEMANDA_CODIGO}</Text>
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.label}>{L.planningDate}</Text>
          <Text style={styles.value}>{DATA_ABERTURA}</Text>
        </View>

        <Text style={styles.sectionTitle}>{L.specification}</Text>
        <Text style={styles.paragraph}>{normalizeRichText(ESPECIFICACAO)}</Text>

        <Text style={styles.sectionTitle}>{L.schedule}</Text>
        <Text style={styles.paragraph}>{normalizeRichText(CRONOGRAMA)}</Text>

        <Text style={styles.sectionTitle}>{L.expectedResult}</Text>
        <Text style={styles.paragraph}>{normalizeRichText(RESULTADO_ESPERADO)}</Text>

        <Text style={styles.sectionTitle}>{L.costs}</Text>
        <View wrap={false} style={styles.labelRow}>
          <View style={styles.table}>
            <View style={styles.row} fixed>
              <Text style={styles.cellHeader}>Perfil</Text>
              <Text style={styles.cellHeader}>Horas</Text>
              <Text style={styles.cellHeader}>Valor/Hora</Text>
              <Text style={styles.cellHeader}>Total</Text>
            </View>
            {CUSTOS_DETALHADOS.map((item, i) => (
              <View style={styles.row} key={i} wrap>
                <Text style={styles.cell}>{item.perfil}</Text>
                <Text style={styles.cell}>{item.horas}</Text>
                <Text style={styles.cell}>{moeda(item.valorHora)}</Text>
                <Text style={styles.cell}>
                  {moeda(item.horas * item.valorHora)}
                </Text>
              </View>
            ))}
            <View style={styles.row}>
              <Text style={[styles.cell, { flex: 3, fontWeight: "bold" }]}>
                TOTAL GERAL
              </Text>
              <Text style={[styles.cell, { fontWeight: "bold" }]}>
                {moeda(totalGeral)}
              </Text>
            </View>
          </View>
        </View>


        <View style={styles.assinatura} wrap={false}>

          <Text style={styles.sectionTitle}>{L.signature}</Text>
          <Text>{L.signatureNote}</Text>
          
          <Text style={{ marginTop: 36 }}>________________________________________</Text>
          <Text>{L.signerName}</Text>
          <Text>{L.signerRole}</Text>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => L.pageOf(pageNumber, totalPages)}
        />
      </Page>
    </Document>
  );
}

/** Com useTranslation para uso na aplicação (preview no browser etc.). */
export default function TPE(props: TPEProps) {
  const { t } = useTranslation();
  const { labels: L } = props;

  const resolvedLabels: TPELabels = L
    ? { ...L }
    : {
        documentTitle: t("planningTerm.report.documentTitle"),
        demandNumber: t("planningTerm.report.demandNumber"),
        planningDate: t("planningTerm.report.planningDate"),
        specification: t("planningTerm.report.specification"),
        schedule: t("planningTerm.report.schedule"),
        expectedResult: t("planningTerm.report.expectedResult"),
        costs: t("planningTerm.report.costs"),
        signature: t("planningTerm.report.signature"),
        signatureNote: t("planningTerm.report.signatureNote"),
        signerName: t("planningTerm.report.signerName"),
        signerRole: t("planningTerm.report.signerRole"),
        pageOf: (p: number, tot: number) => t("planningTerm.report.pageOf", { page: p, total: tot }),
      };

  return <TermoPlanejamentoReportInner {...props} labels={resolvedLabels} />;
}
