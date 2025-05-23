import { z } from "zod";

import { createLogger } from "../../logger";

const imageSizeFieldSchema = z.coerce.number().gte(256).default(1024);

export const imageSizeInputSchema = z.object({
  imageSize: imageSizeFieldSchema,
});

export type ImageSizeInput = z.infer<typeof imageSizeInputSchema>;

const titleTemplateFieldSchema = z.string().default("{{variant.product.name}} - {{variant.name}}");

export const titleTemplateInputSchema = z.object({
  titleTemplate: titleTemplateFieldSchema,
});

export type TitleTemplateInput = z.infer<typeof titleTemplateInputSchema>;

const attributeMappingSchema = z.object({
  brandAttributeIds: z.array(z.string()).default([]),
  colorAttributeIds: z.array(z.string()).default([]),
  sizeAttributeIds: z.array(z.string()).default([]),
  materialAttributeIds: z.array(z.string()).default([]),
  patternAttributeIds: z.array(z.string()).default([]),
  gtinAttributeIds: z.array(z.string()).default([]),
  shippingLabelAttributeIds: z.array(z.string()).default([]),
});

const s3ConfigSchema = z.object({
  bucketName: z.string().min(1),
  secretAccessKey: z.string().min(1),
  accessKeyId: z.string().min(1),
  region: z.string().min(1),
});

const urlConfigurationSchema = z.object({
  storefrontUrl: z.string().min(1).url(),
  productStorefrontUrl: z.string().min(1).url(),
});

const rootAppConfigSchema = z.object({
  s3: s3ConfigSchema.nullable(),
  titleTemplate: titleTemplateFieldSchema
    .optional()
    .default(titleTemplateFieldSchema.parse(undefined)),
  imageSize: imageSizeFieldSchema.optional().default(imageSizeFieldSchema.parse(undefined)),
  attributeMapping: attributeMappingSchema
    .nullable()
    .optional()
    .default(attributeMappingSchema.parse({})),
  channelConfig: z.record(z.object({ storefrontUrls: urlConfigurationSchema })),
});

export const AppConfigSchema = {
  root: rootAppConfigSchema,
  s3Bucket: s3ConfigSchema,
  channelUrls: urlConfigurationSchema,
  attributeMapping: attributeMappingSchema,
};

export type RootConfig = z.infer<typeof rootAppConfigSchema>;

export type ChannelUrlsConfig = z.infer<typeof AppConfigSchema.channelUrls>;

const logger = createLogger("AppConfig");

export class AppConfig {
  private rootData: RootConfig = {
    channelConfig: {},
    s3: null,
    attributeMapping: attributeMappingSchema.parse({}),
    titleTemplate: titleTemplateFieldSchema.parse(undefined),
    imageSize: imageSizeFieldSchema.parse(undefined),
  };

  constructor(initialData?: RootConfig) {
    if (initialData) {
      try {
        this.rootData = rootAppConfigSchema.parse(initialData);
      } catch (e) {
        logger.error("Could not parse initial data", { error: e });
        throw new Error("Can't load the configuration");
      }
    }
  }

  static parse(serializedSchema: string) {
    return new AppConfig(JSON.parse(serializedSchema));
  }

  getRootConfig() {
    return this.rootData;
  }

  serialize() {
    return JSON.stringify(this.rootData);
  }

  setS3(s3Config: z.infer<typeof s3ConfigSchema>) {
    try {
      logger.debug("Setting S3 config");
      this.rootData.s3 = s3ConfigSchema.parse(s3Config);

      logger.debug("S3 config saved");

      return this;
    } catch (e) {
      logger.info("Invalid S3 config provided", { error: e });
      throw new Error("Invalid S3 config provided");
    }
  }

  setAttributeMapping(attributeMapping: z.infer<typeof attributeMappingSchema>) {
    try {
      logger.debug("Setting attribute mapping");
      this.rootData.attributeMapping = attributeMappingSchema.parse(attributeMapping);

      logger.debug("Attribute mapping saved");

      return this;
    } catch (e) {
      logger.info("Invalid mapping config provided", { error: e });
      throw new Error("Invalid mapping config provided");
    }
  }

  setChannelUrls(channelSlug: string, urlsConfig: z.infer<typeof urlConfigurationSchema>) {
    try {
      logger.debug("Setting channel urls", { channelSlug });
      const parsedConfig = urlConfigurationSchema.parse(urlsConfig);

      this.rootData.channelConfig[channelSlug] = {
        storefrontUrls: parsedConfig,
      };

      logger.debug("Channel urls saved");

      return this;
    } catch (e) {
      logger.info("Invalid channels config provided", { error: e });
      throw new Error("Invalid channels config provided");
    }
  }

  getUrlsForChannel(channelSlug: string) {
    try {
      return this.rootData.channelConfig[channelSlug].storefrontUrls;
    } catch (e) {
      return undefined;
    }
  }

  getS3Config() {
    return this.rootData.s3;
  }

  getAttributeMapping() {
    return this.rootData.attributeMapping;
  }

  setTitleTemplate(titleTemplate: z.infer<typeof titleTemplateFieldSchema>) {
    this.rootData.titleTemplate = titleTemplate;

    return this;
  }

  getTitleTemplate() {
    return this.rootData.titleTemplate;
  }

  setImageSize(imageSize: z.infer<typeof imageSizeFieldSchema>) {
    this.rootData.imageSize = imageSize;

    return this;
  }

  getImageSize() {
    return this.rootData.imageSize;
  }
}
