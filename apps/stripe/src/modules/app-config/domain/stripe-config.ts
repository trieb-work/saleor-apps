import { err, ok, Result } from "neverthrow";

import { BaseError } from "@/lib/errors";
import { StripePublishableKey } from "@/modules/stripe/stripe-publishable-key";
import { StripeRestrictedKey } from "@/modules/stripe/stripe-restricted-key";
import { StripeWebhookSecret } from "@/modules/stripe/stripe-webhook-secret";

export class StripeConfig {
  readonly name: string;
  readonly id: string;
  readonly restrictedKey: StripeRestrictedKey;
  readonly publishableKey: StripePublishableKey;
  readonly webhookSecret: StripeWebhookSecret;
  readonly webhookId: string;

  static ValidationError = BaseError.subclass("ValidationError", {
    props: {
      _internalName: "StripeConfig.ValidationError" as const,
    },
  });

  private constructor(props: {
    name: string;
    id: string;
    restrictedKey: StripeRestrictedKey;
    publishableKey: StripePublishableKey;
    webhookSecret: StripeWebhookSecret;
    webhookId: string;
  }) {
    this.name = props.name;
    this.id = props.id;
    this.restrictedKey = props.restrictedKey;
    this.publishableKey = props.publishableKey;
    this.webhookSecret = props.webhookSecret;
    this.webhookId = props.webhookId;
  }

  static create(args: {
    name: string;
    id: string;
    webhookSecret: StripeWebhookSecret;
    webhookId: string;
    restrictedKey: StripeRestrictedKey;
    publishableKey: StripePublishableKey;
  }): Result<StripeConfig, InstanceType<typeof StripeConfig.ValidationError>> {
    if (args.name.length === 0) {
      return err(new StripeConfig.ValidationError("Config name cannot be empty"));
    }

    if (args.id.length === 0) {
      return err(new StripeConfig.ValidationError("Config id cannot be empty"));
    }

    const isPkTest = args.publishableKey.startsWith("pk_test");
    const isPkLive = args.publishableKey.startsWith("pk_live");
    const isRkTest = args.restrictedKey.startsWith("rk_test");
    const isRkLive = args.restrictedKey.startsWith("rk_live");

    const isBothTest = isRkTest && isPkTest;
    const isBothLive = isRkLive && isPkLive;

    const isBothTestOrLive = isBothTest || isBothLive;

    if (!isBothTestOrLive) {
      return err(
        new StripeConfig.ValidationError(
          "Publishable key and restricted key must be of the same environment - TEST or LIVE",
        ),
      );
    }

    return ok(
      new StripeConfig({
        name: args.name,
        id: args.id,
        restrictedKey: args.restrictedKey,
        publishableKey: args.publishableKey,
        webhookSecret: args.webhookSecret,
        webhookId: args.webhookId,
      }),
    );
  }
}

export type StripeFrontendConfigSerializedFields = {
  readonly name: string;
  readonly id: string;
  readonly restrictedKey: string;
  readonly publishableKey: string;
};

/**
 * Safe class that only returns whats permitted to the UI.
 * It also allows to serialize and deserialize itself, so it can be easily transported via tRPC
 */
export class StripeFrontendConfig implements StripeFrontendConfigSerializedFields {
  readonly name: string;
  readonly id: string;
  readonly restrictedKey: string;
  readonly publishableKey: string;

  private constructor(fields: StripeFrontendConfigSerializedFields) {
    this.name = fields.name;
    this.id = fields.id;
    this.restrictedKey = fields.restrictedKey;
    this.publishableKey = fields.publishableKey;
  }

  private static getMaskedKeyValue(key: StripeRestrictedKey) {
    return `...${key.slice(-4)}`;
  }

  getStripeEnvValue() {
    return this.publishableKey.startsWith("pk_test") ? "TEST" : "LIVE";
  }

  static createFromStripeConfig(stripeConfig: StripeConfig) {
    return new StripeFrontendConfig({
      name: stripeConfig.name,
      id: stripeConfig.id,
      publishableKey: stripeConfig.publishableKey,
      restrictedKey: this.getMaskedKeyValue(stripeConfig.restrictedKey),
    });
  }

  static createFromSerializedFields(fields: StripeFrontendConfigSerializedFields) {
    return new StripeFrontendConfig(fields);
  }
}
