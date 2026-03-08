const defaultLogoIbama = `${typeof window !== 'undefined' ? window.location.origin : ''}/ibama.jpg`;
const defaultLogoUfla = `${typeof window !== 'undefined' ? window.location.origin : ''}/ufla1.png`;

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
  } from "@react-pdf/renderer";

  import { useTranslation } from "react-i18next";

   export type TAD5Labels = {
    documentTitle: string;
    demandNumber: string;
    demandDate: string;
    descriptivo: string;
    signature: string;
    signatureNote: string;
    signerName: string;
    signerRole: string;
    pageOf: (page: number, total: number) => string;
  };

  export type TAD5Props = {
    PROJETO_COD_TED: string;
    PROJETO_NOME: string;
    DEMANDA_CODIGO: string;
    DATA_ABERTURA: string;
    TERMO_DESCRICAO: string;
    /** URL do logo Ibama (se omitido, usa /ibama.jpg na origin) */
    logoIbama?: string;
    /** URL do logo UFLA (se omitido, usa /ufla1.png na origin; use import de asset para PDF) */
    logoUfla?: string;
    /** Quando fornecidas (ex.: geração via service sem contexto i18n), substituem t() */
    labels?: TAD5Labels;
  };

  /** Props do componente puro: sem hooks, para uso em pdf() no service */
  export type TAD5PropsWithLabels = Omit<TAD5Props, "labels"> & { labels: TAD5Labels };
  
 
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

    borderBottomWidth: 1,        // ok
    borderBottomColor: "#000",  // ok
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
    fontWeight: "bold",
  },
  sectionSubTitle: {
    fontSize: 4,
    fontWeight: "normal",
  },
  box: {
    minHeight: 160,

    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  
    borderColor: "#000",
    padding: 8,
    marginBottom: 20,
  },
  assinatura: {
    marginTop: 40,
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
  },
});


  /**
   * Componente puro sem hooks: para uso em pdf() no termoService.
   * Não usa useTranslation (evita erro "useSyncExternalStore is not a function" no contexto do react-pdf).
   */
  export function TermoAberturaReportInner(props: TAD5PropsWithLabels) {
    const {
      PROJETO_COD_TED,
      PROJETO_NOME,
      DEMANDA_CODIGO,
      DATA_ABERTURA,
      TERMO_DESCRICAO,
      logoIbama = defaultLogoIbama,
      logoUfla = defaultLogoUfla,
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
            <Text style={styles.label}>{L.demandDate}</Text>
            <Text style={styles.value}>{DATA_ABERTURA}</Text>
          </View>

          <Text style={styles.sectionTitle}>{L.descriptivo}</Text>
          <View style={styles.box}>
            <Text>{TERMO_DESCRICAO}</Text>
          </View>

          <Text style={styles.sectionTitle}>{L.signature}</Text>
          <Text
            style={{
              fontFamily: "Times-Italic",
              fontSize: 8,
            }}
          >
            {L.signatureNote}
          </Text>

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
  export default function TAD5(props: TAD5Props) {
    const { t } = useTranslation();
    const { labels: L } = props;

    const resolvedLabels: TAD5Labels = L
      ? { ...L }
      : {
          documentTitle: t("openingTerm.report.documentTitle"),
          demandNumber: t("openingTerm.report.demandNumber"),
          demandDate: t("openingTerm.report.demandDate"),
          descriptivo: t("openingTerm.report.descriptivo"),
          signature: t("openingTerm.report.signature"),
          signatureNote: t("openingTerm.report.signatureNote"),
          signerName: t("openingTerm.report.signerName"),
          signerRole: t("openingTerm.report.signerRole"),
          pageOf: (p: number, tot: number) => t("openingTerm.report.pageOf", { page: p, total: tot }),
        };

    return <TermoAberturaReportInner {...props} labels={resolvedLabels} />;
  }
  