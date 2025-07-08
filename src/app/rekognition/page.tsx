'use client';

import { useState } from 'react';

export default function RekognitionPage() {
  const [image, setImage] = useState<File | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
      setProduct(null);
      setQuestions([]);
      setAnswers([]);
    }
  };

  const handleUpload = async () => {
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', image);

    const res = await fetch('/api/ai/rekognition', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setProduct(data.product || null);
    setQuestions(data.questions || []);
    setAnswers(new Array(data.questions?.length || 0).fill(''));
    setLoading(false);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmitAnswers = () => {
    // For now, simply log answers; you can send to your backend for pricing/quote generation
    console.log({
      product,
      questions,
      answers,
    });
    alert('Answers submitted successfully!');
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Product Identification & Details Collection</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        disabled={loading || !image}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Processing...' : 'Upload & Analyze'}
      </button>

      {product && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Identified Product:</h2>
          <p className="text-gray-800">{product}</p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Please answer these questions for accurate quotation:</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitAnswers();
            }}
            className="space-y-4"
          >
            {questions.map((question, idx) => (
              <div key={idx} className="flex flex-col">
                <label className="font-medium">{question.replace(/^\d+\.\s*/, '')}</label>
                <input
                  type="text"
                  className="mt-1 p-2 border rounded"
                  value={answers[idx] || ''}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  required
                />
              </div>
            ))}
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Submit Answers
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
