import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { fetchPlacesByCityAndFilters } from "../lib/supabasePlaces";
import { invokeLLM } from "../_core/llm";

export type PlanItem = {
  time: string;
  place: string;
  area: string;
  note: string;
};

export type PlanResponse = {
  plan: PlanItem[];
  notes: string;
  source: "gemini" | "fallback" | "sheet-empty";
};

/**
 * Generate a fallback plan when LLM fails or no candidates
 */
function generateFallbackPlan(
  candidates: any[],
  timeSlot: string,
  city: string
): PlanItem[] {
  if (candidates.length === 0) {
    return [];
  }

  const timeSlots = {
    morning: ["08:00", "09:00", "10:00"],
    afternoon: ["13:00", "14:00", "15:00"],
    evening: ["18:00", "19:00", "20:00"],
    "full-day": ["08:00", "12:00", "17:00"],
    weekend: ["09:00", "13:00", "18:00"],
  };

  const times = timeSlots[timeSlot as keyof typeof timeSlots] || [
    "09:00",
    "13:00",
    "18:00",
  ];
  const topCandidates = candidates.slice(0, Math.min(3, candidates.length));

  return topCandidates.map((place, index) => ({
    time: times[index] || `${9 + index * 4}:00`,
    place: place.name,
    area: place.area,
    note: `Khám phá ${place.name} tại ${place.area}. Hãy kiểm tra giờ mở cửa và đặt chỗ trước!`,
  }));
}

/**
 * Parse LLM response safely
 */
function parseLLMResponse(content: string): PlanResponse | null {
  try {
    // Remove markdown code fences if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (
      !parsed.plan ||
      !Array.isArray(parsed.plan) ||
      typeof parsed.notes !== "string"
    ) {
      return null;
    }

    return {
      plan: parsed.plan,
      notes: parsed.notes,
      source: "gemini",
    };
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    return null;
  }
}

/**
 * Build Vietnamese prompt for LLM
 */
function buildPrompt(
  city: string,
  timeSlot: string,
  vibes: string[],
  interests: string[],
  budget: string | undefined,
  groupSize: string | undefined,
  candidates: any[]
): string {
  const candidatesJson = candidates
    .slice(0, 10)
    .map((p) => ({
      name: p.name,
      area: p.area,
      type: p.type,
      vibes: p.vibes,
      budget: p.budget,
      tags: p.tags,
    }));

  return `Bạn là một hướng dẫn du lịch chuyên nghiệp tại ${city}, Việt Nam. Hãy tạo một kế hoạch du lịch dựa trên yêu cầu của khách hàng.

Yêu cầu của khách hàng:
- Thành phố: ${city}
- Khung giờ: ${timeSlot}
- Vibe/Tâm trạng: ${vibes.join(", ") || "Không chỉ định"}
- Sở thích: ${interests.join(", ") || "Không chỉ định"}
- Ngân sách: ${budget || "Không chỉ định"}
- Kích thước nhóm: ${groupSize || "Không chỉ định"}

Các địa điểm có sẵn:
${JSON.stringify(candidatesJson, null, 2)}

Hãy:
1. Chọn 2-4 địa điểm phù hợp nhất từ danh sách trên
2. Gán khung giờ thích hợp cho mỗi địa điểm
3. Tạo một kế hoạch chi tiết

Trả về CHỈ JSON (không có markdown, không có code fence) với cấu trúc sau:
{
  "plan": [
    { "time": "HH:MM", "place": "Tên địa điểm", "area": "Khu vực", "note": "Mô tả ngắn" }
  ],
  "notes": "Ghi chú tổng quát về kế hoạch"
}`;
}

export const planRouter = router({
  generate: publicProcedure
    .input(
      z.object({
        city: z.string(),
        timeSlot: z.string(),
        vibes: z.array(z.string()),
        interests: z.array(z.string()),
        budget: z.string().optional(),
        groupSize: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<PlanResponse> => {
      const { city, timeSlot, vibes, interests, budget, groupSize } = input;

      // Fetch candidate places from Supabase
      const candidates = await fetchPlacesByCityAndFilters({
        city,
        vibes,
        interests,
        budget,
      });

      // If no candidates, return empty plan
      if (candidates.length === 0) {
        return {
          plan: [],
          notes: "Hiện tại chưa có địa điểm phù hợp trong database cho thành phố này.",
          source: "sheet-empty",
        };
      }

      try {
        // Call LLM with Vietnamese prompt
        const prompt = buildPrompt(
          city,
          timeSlot,
          vibes,
          interests,
          budget,
          groupSize,
          candidates
        );

        const response = await invokeLLM({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const messageContent = response.choices[0]?.message?.content;
        const content = typeof messageContent === 'string' ? messageContent : '';

        // Try to parse LLM response
        if (content) {
          const parsed = parseLLMResponse(content);
          if (parsed) {
            return parsed;
          }
        }

        // Fallback to rule-based plan
        const fallbackPlan = generateFallbackPlan(
          candidates,
          timeSlot,
          city
        );
        return {
          plan: fallbackPlan,
          notes: `Kế hoạch du lịch tại ${city} cho khung giờ ${timeSlot}. Hãy kiểm tra giờ mở cửa và đặt chỗ trước!`,
          source: "fallback",
        };
      } catch (error) {
        console.error("LLM call failed:", error);
      }

      // Fallback to rule-based plan
      const fallbackPlan = generateFallbackPlan(
        candidates,
        timeSlot,
        city
      );
      return {
        plan: fallbackPlan,
        notes: `Kế hoạch du lịch tại ${city} cho khung giờ ${timeSlot}. Hãy kiểm tra giờ mở cửa và đặt chỗ trước!`,
        source: "fallback",
      };
    }),
});
