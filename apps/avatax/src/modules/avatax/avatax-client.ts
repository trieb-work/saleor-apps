import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { ATTR_PEER_SERVICE } from "@opentelemetry/semantic-conventions/incubating";
import { ObservabilityAttributes } from "@saleor/apps-otel/src/observability-attributes";
import Avatax from "avatax";
import { DocumentType } from "avatax/lib/enums/DocumentType";
import { VoidReasonCode } from "avatax/lib/enums/VoidReasonCode";
import { AddressLocationInfo as AvataxAddress } from "avatax/lib/models/AddressLocationInfo";
import { CommitTransactionModel } from "avatax/lib/models/CommitTransactionModel";
import { CreateTransactionModel } from "avatax/lib/models/CreateTransactionModel";
import { fromPromise } from "neverthrow";

import { internalMeter } from "@/lib/otel/metrics";
import { OtelTenatDomainResolver } from "@/lib/otel/otel-tenant-domain-resolver";
import { appExternalTracer } from "@/lib/otel/tracing";
import { createLogger } from "@/logger";
import { loggerContext } from "@/logger-context";

import { AvataxErrorsParser } from "./avatax-errors-parser";

export type CommitTransactionArgs = {
  companyCode: string;
  transactionCode: string;
  model: CommitTransactionModel;
  documentType: DocumentType;
};

export type CreateTransactionArgs = {
  model: CreateTransactionModel;
};

export type ValidateAddressArgs = {
  address: AvataxAddress;
};

export type VoidTransactionArgs = {
  transactionCode: string;
  companyCode: string;
};

export class AvataxClient {
  private logger = createLogger("AvataxClient");
  private errorParser = new AvataxErrorsParser();
  // TODO: after testing phase change it to be externalMeter
  private apiCallsCounter = internalMeter.createCounter("saleor.app.avatax.api.requests", {
    description: "The number of requests to AvaTax API",
    unit: "{request}",
  });
  private avataxEnviromentObervabilityAttribute = "avatax.enviroment";
  private tenantDomainResolver = new OtelTenatDomainResolver({ loggerContext });

  constructor(private client: Avatax) {}

  private getAvaTaxEnviroment() {
    return this.client.baseUrl === "https://sandbox-rest.avatax.com" ? "sandbox" : "production";
  }

  async createTransaction({ model }: CreateTransactionArgs) {
    return appExternalTracer.startActiveSpan(
      "calling AvaTax createOrAdjustTransaction API",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [ATTR_PEER_SERVICE]: "avatax",
          "avatax.document_type": DocumentType[model.type ?? "Any"],
          [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
        },
      },
      (span) => {
        return fromPromise(
          /*
           * We use createOrAdjustTransaction instead of createTransaction because
           * we must guarantee a way of idempotent update of the transaction due to the
           * migration requirements. The transaction can be created in the old flow, but committed in the new flow.
           */
          this.client.createOrAdjustTransaction({
            model: { createTransactionModel: model },
          }),
          (error) => {
            return this.errorParser.parse(error);
          },
        )
          .map((response) => {
            span.setStatus({
              code: SpanStatusCode.OK,
              message: "Transaction created or adjusted successfully",
            });

            this.apiCallsCounter.add(1, {
              status: "success",
              method: "create_or_adjust_transaction",
              [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
              [ObservabilityAttributes.TENANT_DOMAIN]: this.tenantDomainResolver.getDomain(),
            });

            return response;
          })
          .mapErr((error) => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Failed to create or adjust transaction",
            });

            this.apiCallsCounter.add(1, {
              status: "error",
              method: "create_or_adjust_transaction",
              [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
              [ObservabilityAttributes.TENANT_DOMAIN]: this.tenantDomainResolver.getDomain(),
            });

            return error;
          });
      },
    );
  }

  async voidTransaction({
    transactionCode,
    companyCode,
  }: {
    transactionCode: string;
    companyCode: string;
  }) {
    return appExternalTracer.startActiveSpan(
      "calling AvaTax voidTransaction API",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [ATTR_PEER_SERVICE]: "avatax",
          "avatax.code": VoidReasonCode["DocVoided"],
        },
      },
      (span) => {
        return fromPromise(
          this.client.voidTransaction({
            transactionCode,
            companyCode,
            model: { code: VoidReasonCode.DocVoided },
          }),
          (error) => {
            const parsedError = this.errorParser.parse(error);

            this.logger.error("Error voiding transaction", {
              error: parsedError,
              transactionCode: transactionCode,
              companyCode: companyCode,
            });

            return parsedError;
          },
        )
          .map((response) => {
            span.setStatus({
              code: SpanStatusCode.OK,
              message: "Transaction voided successfully",
            });

            this.apiCallsCounter.add(1, {
              status: "success",
              method: "void_transaction",
              [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
              [ObservabilityAttributes.TENANT_DOMAIN]: this.tenantDomainResolver.getDomain(),
            });

            return response;
          })
          .mapErr((error) => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Failed to void transaction",
            });

            this.apiCallsCounter.add(1, {
              status: "error",
              method: "void_transaction",
              [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
              [ObservabilityAttributes.TENANT_DOMAIN]: this.tenantDomainResolver.getDomain(),
            });

            return error;
          });
      },
    );
  }

  async validateAddress({ address }: ValidateAddressArgs) {
    return fromPromise(this.client.resolveAddress(address), this.errorParser.parse);
  }

  async listTaxCodes({ filter }: { filter: string | null }) {
    return fromPromise(
      this.client.listTaxCodes({
        ...(filter ? { filter: `taxCode contains "${filter}"` } : {}),
        top: 50,
      }),
      (error) => {
        const parsedError = this.errorParser.parse(error);

        this.logger.error("Failed to call listTaxCodes on Avatax client", {
          error: parsedError,
        });

        return parsedError;
      },
    );
  }

  async ping() {
    return fromPromise(this.client.ping(), this.errorParser.parse);
  }

  async getEntityUseCode(useCode: string) {
    return appExternalTracer.startActiveSpan(
      "calling AvaTax listEntityUseCodes API",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [ATTR_PEER_SERVICE]: "avatax",
          "avatax.use_code": useCode,
        },
      },
      (span) => {
        return fromPromise(
          this.client.listEntityUseCodes({
            // https://developer.avalara.com/avatax/filtering-in-rest/
            filter: `code eq ${useCode}`,
          }),
          (error) => {
            const parsedError = this.errorParser.parse(error);

            this.logger.error("Failed to get entity use code", {
              error: parsedError,
              useCode,
            });

            return parsedError;
          },
        )
          .map((response) => {
            span.setStatus({
              code: SpanStatusCode.OK,
              message: "Entity use code fetched successfully",
            });

            this.apiCallsCounter.add(1, {
              status: "success",
              method: "list_entity_use_code",
              [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
              [ObservabilityAttributes.TENANT_DOMAIN]: this.tenantDomainResolver.getDomain(),
            });

            return response;
          })
          .mapErr((error) => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Failed to fetch entity use code",
            });

            this.apiCallsCounter.add(1, {
              status: "error",
              method: "list_entity_use_code",
              [this.avataxEnviromentObervabilityAttribute]: this.getAvaTaxEnviroment(),
              [ObservabilityAttributes.TENANT_DOMAIN]: this.tenantDomainResolver.getDomain(),
            });

            return error;
          });
      },
    );
  }
}
