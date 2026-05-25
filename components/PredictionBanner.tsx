v"use client";

type PredictionBannerProps = {
  predictionText?: string;
};

export default function PredictionBanner({ predictionText }: PredictionBannerProps) {
  if (!predictionText) return null;

  return (
    <div className="bg-blue-900 border border-blue-700 text-blue-300 p-4 rounded mb-6">
      <p className="font-semibold">AI Prediction</p>
      <p className="mt-1">{predictionText}</p>
    </div>
  );
}
