import { GoogleGenAI, Type } from "@google/genai";
import { Item, Rarity, ItemType } from "../types";

// Ensure a fallback string is provided if env var is missing during build time check
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// Generates flavor text and unique names for ANY item
export const generateItemDetails = async (level: number, itemType: ItemType, rarity: Rarity): Promise<Partial<Item>> => {
  try {
    let typeString = "ПРЕДМЕТ";
    if (itemType === ItemType.WEAPON) typeString = "ОРУЖИЕ";
    else if (itemType === ItemType.ACCESSORY) typeString = "АКСЕССУАР";
    else if (itemType === ItemType.ARMOR) typeString = "ДОСПЕХИ";
    
    // Prompt tuning based on rarity
    let promptStyle = "обычное, простое";
    if (rarity === Rarity.RARE) promptStyle = "качественное, надежное, с боевой историей";
    if (rarity === Rarity.EPIC) promptStyle = "магическое, светящееся, древнее";
    if (rarity === Rarity.LEGENDARY) promptStyle = "БОЖЕСТВЕННОЕ, УНИКАЛЬНОЕ, ЭПИЧНОЕ, с душой";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Сгенерируй название и описание для предмета в RPG игре.
      Тип: ${typeString}
      Редкость: ${rarity} (${promptStyle})
      Уровень: ${level}
      Язык: Русский.
      Название должно быть коротким (2-3 слова).
      Описание - 1 предложение, атмосферный лор или шутка (для обычных предметов).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("No text returned from Gemini");
    }

    const json = JSON.parse(responseText);
    return {
      name: json.name,
      description: json.description
    };
  } catch (error) {
    console.error("Gemini generation failed, falling back to static", error);
    // Fallback if API fails
    return {
      name: `Предмет ${level} уровня`,
      description: "Обычный предмет, найденный в пыли."
    };
  }
};