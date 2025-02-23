import axios from "npm:axios";
import * as cheerio from "npm:cheerio";
import {
  NodeHtmlMarkdown,
  // NodeHtmlMarkdownOptions,
} from "npm:node-html-markdown";
import fs from "node:fs";
import path from "node:path";

const SAVE_DIR = "./articles";

const getCleanImgUrl = (url: string): [string, string] => {
  const cleanUrl = url.startsWith("//") ? url.split("?fname=")[1] : url;
  const extension = cleanUrl.split("/").pop()?.includes(".")
    ? cleanUrl.split("/").pop()?.split(".").pop()?.toLowerCase() || ""
    : "";
  return [cleanUrl, extension];
};

const formatDate = (dateText: string) => {
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const [monthStr, day, year] = dateText.replace(".", "").split(" ");
  const utcDate = new Date(
    Date.UTC(
      Number(year),
      monthMap[monthStr as keyof typeof monthMap],
      Number(day)
    )
  );

  const formattedDate = utcDate.toISOString().split("T")[0];

  return formattedDate;
};

async function backupBrunchArticle(url: string) {
  try {
    const urlParts = url.split("/");
    const dirName = path.join(SAVE_DIR, urlParts[urlParts.length - 1]);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const metadata = {
      title: $(".cover_title").text().trim(),
      subtitle: $(".cover_sub_title").text().trim(),
      date: formatDate($(".f_l.date").text().trim()),
    };
    fs.writeFileSync(
      path.join(dirName, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    const coverImageUrl = $(".cover_image")
      .attr("style")
      ?.split("url(")[1]
      .split(")")[0]
      .trim();

    if (coverImageUrl) {
      const [cleanCoverImageUrl, coverImageExtension] =
        getCleanImgUrl(coverImageUrl);

      const coverImageFileName = `cover.${coverImageExtension}`;
      const coverImagePath = path.join(dirName, coverImageFileName);

      const response = await axios.get(cleanCoverImageUrl, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(coverImagePath, response.data);
    }

    const bodyElement = $(".wrap_body");
    const htmlContent = bodyElement.html();
    const jsonData = bodyElement
      .children()
      .map((_, el) => {
        const dataApp = $(el).attr("data-app");
        if (!dataApp) return null;
        return JSON.parse(dataApp.replace(/&quot;/g, '"'));
      })
      .get()
      .filter(Boolean);

    const jsonString = JSON.stringify(jsonData, null, 2);

    const images = bodyElement
      .find("img")
      .map((_, img) => $(img).attr("src"))
      .get();

    const markdown = NodeHtmlMarkdown.translate(
      /* html */ htmlContent?.toString() ?? "",
      /* options (optional) */ {},
      /* customTranslators (optional) */ undefined,
      /* customCodeBlockTranslators (optional) */ undefined
    );

    fs.writeFileSync(path.join(dirName, "data.json"), jsonString);

    // Download images
    let updatedMarkdown = markdown;
    await Promise.all(
      images.map(async (originalImageUrl, i) => {
        const [cleanImgUrl, extension] = getCleanImgUrl(originalImageUrl);
        const imageFileName = `${i}.${extension}`;
        const imagePath = path.join(dirName, imageFileName);

        const response = await axios.get(cleanImgUrl, {
          responseType: "arraybuffer",
        });
        // console.log(imagePath);
        fs.writeFileSync(imagePath, response.data);

        // Replace image URL in markdown
        updatedMarkdown = updatedMarkdown.replace(
          originalImageUrl,
          `./${imageFileName}`
        );
      })
    );

    // Save markdown file
    const markdownPath = path.join(dirName, "body.md");
    fs.writeFileSync(markdownPath, updatedMarkdown);
  } catch (error) {
    console.error("Error saving Brunch article:", url);
    console.error(error);
    return false;
  }
  return true;
}

const BASE_URL = "https://brunch.co.kr/@?????/";

const errorList = [];
for (let i = 1; i <= 60; i++) {
  const isSuccess = await backupBrunchArticle(BASE_URL + i);
  if (!isSuccess) {
    errorList.push(BASE_URL + i);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

console.log(`Failed to backup ${errorList.length} articles`);
for (const url of errorList) {
  console.log(url);
}
