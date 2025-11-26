import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { APP_TITLE } from "@/const";

type PlanItem = {
  time: string;
  place: string;
  area: string;
  note: string;
};

type PlanResponse = {
  plan: PlanItem[];
  notes: string;
  source: "gemini" | "fallback" | "sheet-empty";
};

export default function Home() {
  const [formData, setFormData] = useState({
    city: "",
    timeSlot: "",
    vibes: [] as string[],
    interests: [] as string[],
    budget: "",
    groupSize: "",
  });

  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generatePlanMutation = trpc.plan.generate.useMutation();

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, city: e.target.value });
  };

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, timeSlot: e.target.value });
  };

  const handleVibesChange = (vibe: string) => {
    setFormData((prev) => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter((v) => v !== vibe)
        : [...prev.vibes, vibe],
    }));
  };

  const handleInterestsChange = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, budget: e.target.value });
  };

  const handleGroupSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, groupSize: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validation
    if (!formData.city) {
      setError("Please select a city");
      return;
    }
    if (!formData.timeSlot) {
      setError("Please select a time slot");
      return;
    }
    if (formData.vibes.length === 0) {
      setError("Please select at least one vibe");
      return;
    }
    if (formData.interests.length === 0) {
      setError("Please select at least one interest");
      return;
    }

    setIsLoading(true);
    try {
      const response = await generatePlanMutation.mutateAsync({
        city: formData.city,
        timeSlot: formData.timeSlot,
        vibes: formData.vibes,
        interests: formData.interests,
        budget: formData.budget || undefined,
        groupSize: formData.groupSize || undefined,
      });
      setResult(response);
    } catch (err) {
      setError("Failed to generate plan. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-6 h-6 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-800">{APP_TITLE}</h1>
          </div>
          <p className="text-gray-600">
            Discover your perfect adventure in Vietnam
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-white shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* City Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Where do you want to go? <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.city}
                onChange={handleCityChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select a city</option>
                <option value="Ho Chi Minh City">Ho Chi Minh City</option>
                <option value="Can Tho">Can Tho</option>
                <option value="Ha Noi">Ha Noi</option>
              </select>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                When do you prefer? <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.timeSlot}
                onChange={handleTimeSlotChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="full-day">Full Day</option>
                <option value="weekend">Weekend</option>
              </select>
            </div>

            {/* Vibes Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                What's your vibe?{" "}
                <span className="text-red-500">*</span> (select at least one)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["Chill", "Active", "Party", "Aesthetic", "Romantic"].map(
                  (vibe) => (
                    <label key={vibe} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.vibes.includes(vibe)}
                        onChange={() => handleVibesChange(vibe)}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-gray-700">{vibe}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Interests Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                What interests you?{" "}
                <span className="text-red-500">*</span> (select at least one)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Coffee",
                  "Food",
                  "Photography",
                  "Shopping",
                  "Nature",
                  "Nightlife",
                ].map((interest) => (
                  <label key={interest} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.interests.includes(interest)}
                      onChange={() => handleInterestsChange(interest)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-gray-700">{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Budget (optional)
              </label>
              <select
                value={formData.budget}
                onChange={handleBudgetChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select budget</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Group Size Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Who are you traveling with? <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.groupSize}
                onChange={handleGroupSizeChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select group size</option>
                <option value="Solo">Solo</option>
                <option value="Couple">Couple</option>
                <option value="3-5 friends">3–5 friends</option>
                <option value="Big group">Big group</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? "Generating..." : "Generate Plan"}
            </Button>
          </form>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {result.plan.length === 0 ? (
              <Card className="bg-yellow-50 border border-yellow-200 p-6">
                <p className="text-yellow-800">{result.notes}</p>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {result.plan.map((item, index) => (
                    <Card
                      key={index}
                      className="bg-white border-l-4 border-l-teal-600 p-4"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-teal-100">
                            <span className="text-teal-600 font-semibold">
                              {item.time}
                            </span>
                          </div>
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {item.place}
                          </h3>
                          <p className="text-sm text-gray-600">{item.area}</p>
                          <p className="text-gray-700 mt-2">{item.note}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="bg-gradient-to-r from-teal-50 to-blue-50 p-4">
                  <p className="text-gray-700 mb-2">{result.notes}</p>
                  <p className="text-xs text-gray-500">
                    Source:{" "}
                    <span className="font-semibold">
                      {result.source === "gemini"
                        ? "AI Generated"
                        : "Rule-based"}
                    </span>
                  </p>
                </Card>

                <Button
                  onClick={() => {
                    setResult(null);
                    setFormData({
                      city: "",
                      timeSlot: "",
                      vibes: [],
                      interests: [],
                      budget: "",
                      groupSize: "",
                    });
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg"
                >
                  Plan Another Trip
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
