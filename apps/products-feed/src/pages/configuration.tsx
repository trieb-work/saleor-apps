import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { TextLink } from "@saleor/apps-ui";
import { Box, Button, Text } from "@saleor/macaw-ui";
import { NextPage } from "next";
import { useRouter } from "next/router";

import { ConnectedAttributeMappingForm } from "../modules/app-configuration/attribute-mapping-form";
import { useChannelsExistenceChecking } from "../modules/app-configuration/channels/use-channels-existence-checking";
import { ChannelsConfigAccordion } from "../modules/app-configuration/channels-config-accordion";
import { ConnectedImageConfigurationForm } from "../modules/app-configuration/image-configuration-form";
import { ConnectedS3ConfigurationForm } from "../modules/app-configuration/s3-configuration-form";
import { ConnectedTitleFormattingForm } from "../modules/app-configuration/title-formatting-form";
import { CategoryMappingPreview } from "../modules/category-mapping/ui/category-mapping-preview";
import { AppSection } from "../modules/ui/app-section";
import { Paragraph } from "../modules/ui/paragraph";

const ConfigurationPage: NextPage = () => {
  const { appBridgeState } = useAppBridge();

  useChannelsExistenceChecking();
  const { push } = useRouter();

  if (!appBridgeState) {
    return null;
  }

  if (appBridgeState.user?.permissions.includes("MANAGE_APPS") === false) {
    return <Text>You do not have permission to access this page.</Text>;
  }

  return (
    <Box>
      <Box __marginBottom="100px">
        <Text size={10} fontWeight="bold" as={"h1"} marginBottom={5} data-testid={"root-heading"}>
          Configuration
        </Text>
        <Paragraph>
          Configure app to enable Product Feed, that{" "}
          <TextLink
            newTab
            href={"https://www.google.com/intl/en_en/retail/solutions/merchant-center/"}
          >
            Google Merchant Center
          </TextLink>{" "}
          can consume
        </Paragraph>
        <Text>
          Check{" "}
          <TextLink href={"https://support.google.com/merchants/answer/1219255"} newTab>
            this article how to configure feed
          </TextLink>
        </Text>
      </Box>
      <AppSection
        data-testid={"s3-configuration-section"}
        __marginBottom="100px"
        includePadding
        heading={"AWS S3 Bucket"}
        mainContent={<ConnectedS3ConfigurationForm />}
        sideContent={
          <Box>
            <Paragraph size={3}>
              Your product database can be quite large. To generate a big XML file, we need to put
              it somewhere so Google can consume it. You need to generate an S3 bucket with public
              read access and provide its credentials to the app.
            </Paragraph>
            <Paragraph size={3}>
              Please use this bucket only for XMLs. They meant to be public - but other files may
              leak if you put them to the same bucket.
            </Paragraph>
            <Paragraph size={3}>
              Read about generating AWS credentials{" "}
              <TextLink
                href={
                  "https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html"
                }
                newTab
              >
                here
              </TextLink>
            </Paragraph>
            <Paragraph size={4}>
              Required permissions:
              <ul>
                {[
                  "s3:GetObject",
                  "s3:PutObject",
                  "s3:DeleteObject",
                  "s3:GetObjectAttributes",
                  "s3:ListBucket",
                ].map((perm) => (
                  <li key={perm}>
                    - <code>{perm}</code>
                  </li>
                ))}
              </ul>
            </Paragraph>
          </Box>
        }
      />
      <AppSection
        data-testid={"channels-configuration-section"}
        __marginBottom="100px"
        includePadding
        heading={"Channels configuration"}
        mainContent={
          <Box>
            <ChannelsConfigAccordion />
          </Box>
        }
        sideContent={
          <Box>
            <Paragraph size={3}>App will generate separate feed for each channel</Paragraph>
            <Paragraph size={3}>
              Provide your storefront homepage URL and product template. Use{" "}
              <TextLink href="https://handlebarsjs.com/" newTab>
                Handlebars
              </TextLink>{" "}
              format.
            </Paragraph>
            <Paragraph size={3}>
              The app also supports{" "}
              <TextLink href="https://github.com/helpers/handlebars-helpers/tree/master" newTab>
                Handlebars Helpers
              </TextLink>{" "}
              which provides additional functionality like <code>lowercase</code>,{" "}
              <code>uppercase</code>, and many other helpers to transform your data. Example of the
              variables you can use:
            </Paragraph>
            <ul>
              <li>
                <Text size={3}>
                  <code>{"{{ variant.product.slug }}"}</code> - product `slug`
                </Text>
              </li>
              <li>
                <Text size={3}>
                  <code>{"{{ variant.id }}"}</code> - product variant id
                </Text>
              </li>
              <li>
                <Text size={3}>
                  <code>{"{{ lowercase variant.product.name }}"}</code> - product name in lowercase
                  (useful for URLs)
                </Text>
              </li>
            </ul>
            <Paragraph size={3}>For example following pattern:</Paragraph>
            <Paragraph size={3}>
              <code>{"https://my-shop.com/p/{{ variant.product.slug}}/{{ variant.id }}"}</code>
            </Paragraph>
            <Paragraph size={3}>Will produce:</Paragraph>
            <Paragraph size={3}>
              <code>{"https://my-shop.com/p/t-shirt/Xyp2asZ"}</code>
            </Paragraph>
          </Box>
        }
      />
      <AppSection
        data-testid={"title-configuration-section"}
        __marginBottom="100px"
        includePadding
        heading={"Item title"}
        mainContent={
          <Box>
            <ConnectedTitleFormattingForm />
          </Box>
        }
        sideContent={
          <Box>
            <Paragraph size={3}>
              Customize title of the products. Use{" "}
              <TextLink href="https://handlebarsjs.com/" newTab>
                Handlebars
              </TextLink>{" "}
              format.
            </Paragraph>
            <TextLink href="https://support.google.com/merchants/answer/6324415" newTab>
              Item title specification.
            </TextLink>
          </Box>
        }
      />
      <AppSection
        data-testid={"categories-mapping-section"}
        __marginBottom="100px"
        includePadding
        heading={"Categories mapping"}
        mainContent={
          <Box>
            <CategoryMappingPreview />
            <Box display={"flex"} justifyContent={"flex-end"}>
              <Button marginTop={5} onClick={() => push("/categories")}>
                Map categories
              </Button>
            </Box>
          </Box>
        }
        sideContent={
          <Box>
            <Paragraph size={3}>
              Map Saleor categories to pre-defined Google categories. It is not required.{" "}
              <TextLink newTab href={"https://support.google.com/merchants/answer/6324436?hl=en"}>
                Read more
              </TextLink>
            </Paragraph>
          </Box>
        }
      />
      <AppSection
        data-testid={"attributes-mapping-section"}
        __marginBottom="100px"
        includePadding
        heading={"Attributes mapping"}
        mainContent={<ConnectedAttributeMappingForm />}
        sideContent={
          <Box>
            <Paragraph size={3}>
              Choose which product attributes should be used for the feed. If product has multiple
              attribute values, for example &quot;Primary color&quot; and &quot;Secondary
              color&quot;, both values will be used according to Google guidelines:
            </Paragraph>
            <ul>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324351" newTab>
                  Brand
                </TextLink>
              </li>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324487" newTab>
                  Color
                </TextLink>
              </li>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324410" newTab>
                  Material
                </TextLink>
              </li>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324483" newTab>
                  Pattern
                </TextLink>
              </li>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324492" newTab>
                  Size
                </TextLink>
              </li>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324504" newTab>
                  Shipping Label
                </TextLink>
              </li>
            </ul>
          </Box>
        }
      />

      <AppSection
        data-testid={"image-configuration-section"}
        __marginBottom="100px"
        includePadding
        heading={"Image configuration"}
        mainContent={<ConnectedImageConfigurationForm />}
        sideContent={
          <Box>
            <Paragraph size={3}>Configure size of the images submitted in the feed.</Paragraph>
            <ul>
              <li>
                <TextLink href="https://support.google.com/merchants/answer/6324350?hl=en" newTab>
                  Image link documentation
                </TextLink>
              </li>
            </ul>
          </Box>
        }
      />
    </Box>
  );
};

export default ConfigurationPage;
