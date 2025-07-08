"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ReviewSection({ procurement }: any) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Replace with actual publish endpoint
      await fetch(`/api/procurement/${procurement.id}/publish`, {
        method: "POST",
      });
      alert("Procurement submitted successfully.");
    } catch (error) {
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Final Review</h1>
        <h2 className="text-xl font-medium text-gray-600">{procurement.title}</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-semibold">Basic Details</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-gray-900">{procurement.description || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="text-gray-900">{procurement.category}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Address</p>
              <p className="text-gray-900">{procurement.address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-gray-900 capitalize">{procurement.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-semibold">Evaluation Details</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Start</p>
            <p className="text-gray-900">
              {procurement.evaluationDetails.evaluationStartDate}{" "}
              {procurement.evaluationDetails.evaluationStartTime}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">End</p>
            <p className="text-gray-900">
              {procurement.evaluationDetails.evaluationEndDate}{" "}
              {procurement.evaluationDetails.evaluationEndTime}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-semibold">AI Questions</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {procurement.aiQuestions.map((q: any) => (
            <div key={q.id} className="border-l-4 border-blue-500 pl-4 py-1">
              <p className="font-medium text-gray-900">{q.question}</p>
              <p className="text-gray-700 mt-1">{q.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-semibold">Suppliers</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {procurement.suppliers.map((s: any) => (
              <div key={s.id} className="border rounded-lg p-3">
                <p className="font-medium text-gray-900">{s.name}</p>
                <div className="flex items-center mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    s.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                  }`}></span>
                  <p className="text-sm text-gray-600 capitalize">{s.status}</p>
                </div>
                {(s.city || s.state) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {s.city}{s.city && s.state ? ', ' : ''}{s.state}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-semibold">Scope of Work</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {procurement.scopeOfWork.map((sow: any) => (
            <div key={sow.id} className="border rounded-lg p-5">
              <h3 className="font-bold text-lg mb-3 text-gray-900">{sow.title}</h3>
              <p className="text-gray-700 mb-4">{sow.description}</p>
              
              <div className="space-y-4">
                {sow.questions.map((q: any) => (
                  <div key={q.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">{q.text}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        {q.quantity && (
                          <span className="text-gray-600">
                            <span className="font-medium">Quantity:</span> {q.quantity}
                          </span>
                        )}
                        {q.uom && (
                          <span className="text-gray-600">
                            <span className="font-medium">UOM:</span> {q.uom}
                          </span>
                        )}
                        {q.benchmark && (
                          <span className="text-gray-600">
                            <span className="font-medium">Benchmark:</span> {q.benchmark}
                          </span>
                        )}
                        {q.serviceName && (
                          <span className="text-gray-600">
                            <span className="font-medium">Service:</span> {q.serviceName}
                          </span>
                        )}
                        {q.serviceType && (
                          <span className="text-gray-600">
                            <span className="font-medium">Type:</span> {q.serviceType}
                          </span>
                        )}
                      </div>
                    </div>

                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="mt-3 ml-4 space-y-3">
                        {q.subQuestions.map((sq: any) => (
                          <div key={sq.id} className="border-l-2 border-gray-100 pl-4">
                            <p className="text-gray-800">{sq.text}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-1">
                              {sq.quantity && (
                                <span className="text-gray-600">
                                  <span className="font-medium">Quantity:</span> {sq.quantity}
                                </span>
                              )}
                              {sq.uom && (
                                <span className="text-gray-600">
                                  <span className="font-medium">UOM:</span> {sq.uom}
                                </span>
                              )}
                              {sq.benchmark && (
                                <span className="text-gray-600">
                                  <span className="font-medium">Benchmark:</span> {sq.benchmark}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="min-w-[200px]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Procurement"
          )}
        </Button>
      </div>
    </div>
  );
}