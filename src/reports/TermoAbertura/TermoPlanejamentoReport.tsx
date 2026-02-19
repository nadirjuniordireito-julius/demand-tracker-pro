const logoIbama = `${window.location.origin}/ibama.jpg`;
const logoUfla = `${window.location.origin}/ufla.png`;

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

export type TPEProps = {
  PROJETO_COD_TED: string;
  PROJETO_NOME: string;
  DEMANDA_CODIGO: string;
  DATA_ABERTURA: string;
  ESPECIFICACAO: string;
  CRONOGRAMA: string;
  RESULTADO_ESPERADO: string;
  CUSTOS_DETALHADOS: string;
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
    labels: L,
  } = props;

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
        <View style={styles.box}>
          <Text>{ESPECIFICACAO}</Text>
        </View>

        <Text style={styles.sectionTitle}>{L.schedule}</Text>
        <View style={styles.box}>
          <Text>{CRONOGRAMA}</Text>
        </View>

        <Text style={styles.sectionTitle}>{L.expectedResult}</Text>
        <View style={styles.box}>
          <Text>{RESULTADO_ESPERADO}</Text>
        </View>

        <Text style={styles.sectionTitle}>{L.costs}</Text>
        <View style={styles.box}>
          <Text>{CUSTOS_DETALHADOS}</Text>
        </View>

        <Text style={styles.sectionTitle}>{L.signature}</Text>
        <Text>{L.signatureNote}</Text>

        <View style={styles.assinatura}>
          <Text>________________________________________</Text>
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
