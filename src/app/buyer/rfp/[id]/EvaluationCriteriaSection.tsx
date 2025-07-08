"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/Dialog";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";

interface ScopeOfWorkDeliverable {
  id: string;
  title: string;
  description?: string;
  questions: {
    id: string;
    text: string;
    parentQuestionId?: string | null;
  }[];
}

interface Procurement {
  id: string;
  scopeOfWork: ScopeOfWorkDeliverable[];
}

export default function EvaluationCriteriaSection({ procurement }: { procurement: Procurement }) {
  const [sections, setSections] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalSectionIndex, setModalSectionIndex] = useState<number | null>(null);

  const [evaluationStartDate, setEvaluationStartDate] = useState("");
  const [evaluationStartTime, setEvaluationStartTime] = useState("");
  const [evaluationEndDate, setEvaluationEndDate] = useState("");
  const [evaluationEndTime, setEvaluationEndTime] = useState("");

  const applySectionWeightsEvenly = () => {
    if (sections.length === 0) return;
    const evenWeight = Math.floor(100 / sections.length);
    const updated = sections.map(sec => ({ ...sec, weightPercentage: evenWeight }));
    setSections(updated);
  };

  const applyQuestionWeightsEvenly = () => {
    if (modalSectionIndex === null) return;
    const section = sections[modalSectionIndex];
    if (!section.lineLevelWeights || section.lineLevelWeights.length === 0) return;
    const evenWeight = Math.floor(100 / section.lineLevelWeights.length);
    const updatedSections = [...sections];
    updatedSections[modalSectionIndex].lineLevelWeights = section.lineLevelWeights.map(
      (q: { id: string; text: string; weightPercentage: number }) => ({
        ...q,
        weightPercentage: evenWeight,
      })
    );
    setSections(updatedSections);
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/procurement/evaluation-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procurementRequestId: procurement.id,
          evaluationDetails: {
            evaluationStartDate,
            evaluationStartTime,
            evaluationEndDate,
            evaluationEndTime,
          },
          sections,
        }),
      });

      if (res.ok) {
        alert("Evaluation criteria saved successfully.");
      } else {
        alert("Failed to save evaluation criteria.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An error occurred while saving.");
    }
  };

  useEffect(() => {
  const fetchData = async () => {
    const res = await fetch(`/api/procurement/evaluation-criteria/${procurement.id}`);
    if (res.ok) {
      const data = await res.json();
      setEvaluationStartDate(data.evaluationStartDate);
      setEvaluationStartTime(data.evaluationStartTime);
      setEvaluationEndDate(data.evaluationEndDate);
      setEvaluationEndTime(data.evaluationEndTime);
      setSections(data.sections);
    }
  };

  fetchData();
}, [procurement.id]);


  useEffect(() => {
    if (procurement.scopeOfWork?.length > 0 && sections.length === 0) {
  const initialSections = procurement.scopeOfWork.map(item => ({
    id: item.id,
    title: item.title,
    weightPercentage: 0,
    useLineLevelWeighting: false,
    lineLevelWeights: item.questions
      .filter(q => !q.parentQuestionId)
      .map(q => ({
        id: q.id,
        text: q.text,
        weightPercentage: 0,
        subQuestions: item.questions
          .filter(sub => sub.parentQuestionId === q.id)
          .map(sub => ({
            id: sub.id,
            text: sub.text,
            weightPercentage: 0,
          })),
      })),
  }));
  setSections(initialSections);
}
  }, [procurement.scopeOfWork, sections.length]);

  return (
    <div className="p-8 space-y-8 bg-white rounded-lg shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-800">Evaluation Criteria</h1>
        <p className="text-sm text-gray-500">Configure evaluation parameters and weighting for each section</p>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Evaluation Period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Start Date</Label>
              <Input 
                type="date" 
                value={evaluationStartDate} 
                onChange={e => setEvaluationStartDate(e.target.value)} 
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Start Time</Label>
              <Input 
                type="time" 
                value={evaluationStartTime} 
                onChange={e => setEvaluationStartTime(e.target.value)} 
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">End Date</Label>
              <Input 
                type="date" 
                value={evaluationEndDate} 
                onChange={e => setEvaluationEndDate(e.target.value)} 
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">End Time</Label>
              <Input 
                type="time" 
                value={evaluationEndTime} 
                onChange={e => setEvaluationEndTime(e.target.value)} 
                className="bg-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-700">Evaluation Sections</h2>
              <p className="text-sm text-gray-500">Total weight must equal 100%</p>
            </div>
            <Button 
              variant="outline" 
              onClick={applySectionWeightsEvenly}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Distribute Weights Evenly
            </Button>
          </div>

          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={section.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4 w-full">
                  <div className="font-medium text-gray-800 flex-1 truncate">{section.title}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 bg-gray-50"
                      min="0"
                      max="100"
                      value={section.weightPercentage}
                      onChange={e => {
                        const updated = [...sections];
                        updated[idx].weightPercentage = Number(e.target.value);
                        setSections(updated);
                      }}
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`line-weighting-${section.id}`}
                      checked={section.useLineLevelWeighting}
                      onCheckedChange={(checked: boolean) => {
                        const updated = [...sections];
                        updated[idx].useLineLevelWeighting = checked;
                        setSections(updated);
                        if (checked) {
                          setModalSectionIndex(idx);
                          setShowModal(true);
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`line-weighting-${section.id}`}
                      className={`cursor-pointer ${section.useLineLevelWeighting ? "text-blue-600" : "text-gray-500"}`}
                      onClick={() => {
                        if (section.useLineLevelWeighting) {
                          setModalSectionIndex(idx);
                          setShowModal(true);
                        }
                      }}
                    >
                      Detailed Weighting
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Save Evaluation Criteria
          </Button>
        </div>
      </div>

      {/* Modal for Detailed Weighting */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        {modalSectionIndex !== null && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <span className="font-bold">{sections[modalSectionIndex].title}</span> - Weight Distribution
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Total section weight: {sections[modalSectionIndex].weightPercentage}%
              </p>
            </DialogHeader>

            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={applyQuestionWeightsEvenly}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Distribute Weights Evenly
              </Button>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {sections[modalSectionIndex].lineLevelWeights.length === 0 ? (
  <div className="text-center py-4 text-sm text-gray-500">
    No questions available for detailed weighting in this section.
  </div>
) : (
  sections[modalSectionIndex].lineLevelWeights.map((item: any, idx: any) => (
    <div key={item.id} className="space-y-2">
      {/* Parent Question */}
      <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="text-gray-700 flex-1 pr-4">{item.text}</div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-20 bg-white"
            min="0"
            max="100"
            value={item.weightPercentage}
            onChange={e => {
              const updatedSections = [...sections];
              updatedSections[modalSectionIndex].lineLevelWeights[idx].weightPercentage = Number(e.target.value);
              setSections(updatedSections);
            }}
          />
          <span className="text-gray-500 text-sm">%</span>
        </div>
      </div>

      {/* Sub-Questions */}
      {item.subQuestions && item.subQuestions.length > 0 && (
        <div className="pl-4 space-y-1">
          {item.subQuestions.map((subItem: any, subIdx: any) => (
            <div
              key={subItem.id}
              className="flex items-center justify-between border border-gray-100 rounded-lg p-2 bg-white"
            >
              <div className="text-gray-600 flex-1 pr-4 text-sm">{subItem.text}</div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20 bg-gray-50"
                  min="0"
                  max="100"
                  value={subItem.weightPercentage}
                  onChange={e => {
                    const updatedSections = [...sections];
                    updatedSections[modalSectionIndex].lineLevelWeights[idx].subQuestions[subIdx].weightPercentage = Number(e.target.value);
                    setSections(updatedSections);
                  }}
                />
                <span className="text-gray-400 text-xs">%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ))
)}

              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setShowModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
