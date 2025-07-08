"use client";

import { useState, useRef, useEffect } from "react";
import HeaderSection from "./HeaderSection";
import QuestionsSection from "./QuestionsSection";
import AppendixSection from "./AppendixSection";
import SupplierListSection from "./SupplierListSection";
import EvaluationCriteriaSection from "./EvaluationCriteriaSection";
import ReviewSection from "./ReviewSection";
import { FaCheckCircle, FaTimesCircle, FaChevronRight, FaPlus } from "react-icons/fa";
import { FiSave, FiArrowLeft, FiArrowRight } from "react-icons/fi";

export default function RfpLayout({ procurement: initialProcurement }: any) {
  const [procurement, setProcurement] = useState(initialProcurement);
  const [activeTab, setActiveTab] = useState("header");
  const [activeDeliverable, setActiveDeliverable] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeliverableTitle, setNewDeliverableTitle] = useState("");
  const [newDeliverableDescription, setNewDeliverableDescription] = useState("");
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);

  const questionsRef = useRef<any>(null);

  const deliverableTabs = procurement.scopeOfWork.map((_: any, idx: number) => `questions-${idx}`);
  const tabs = [
    "header",
    "questions",
    ...deliverableTabs,
    "appendix",
    "supplierList",
    "evaluationCriteria",
    "review",
  ];

  useEffect(() => {
    refreshProcurement();
  }, []);

  const deliverableComplete = procurement.scopeOfWork.map(
    (sow: any) => sow.questions && sow.questions.length > 0
  );

  const isComplete = {
    header: !!procurement.title && procurement.title.trim() !== "" && !!procurement.description && procurement.description.trim() !== "",
    questions:
      Array.isArray(procurement.scopeOfWork) &&
      procurement.scopeOfWork.length > 0 &&
      procurement.scopeOfWork.every((sow: any) => Array.isArray(sow.questions) && sow.questions.length > 0),
    appendix:
      (procurement.aiQuestions && procurement.aiQuestions.length > 0) ||
      (!!procurement.appendix && !!procurement.appendix.content && procurement.appendix.content.trim() !== ""),
    supplierList: Array.isArray(procurement.suppliers) && procurement.suppliers.length > 0,
    evaluationCriteria:
      !!procurement.evaluationDetails &&
      typeof procurement.evaluationDetails === "object" &&
      (
        procurement.evaluationDetails.evaluationStartDate ||
        procurement.evaluationDetails.evaluationStartTime ||
        procurement.evaluationDetails.evaluationEndDate ||
        procurement.evaluationDetails.evaluationEndTime
      ),
    review: procurement.status === "ready_for_review",
  };

  const currentTabIndex = tabs.indexOf(
    activeDeliverable !== null ? `questions-${activeDeliverable}` : activeTab
  );

  const refreshProcurement = async () => {
    try {
      const res = await fetch(`/api/procurement/${procurement.id}`);
      if (!res.ok) throw new Error("Failed to refresh procurement");
      const updated = await res.json();
      setProcurement(updated);
    } catch (err) {
      console.error("Refresh error", err);
    }
  };

  const saveCurrentSection = async () => {
    setIsSaving(true);
    try {
      if (activeTab === "questions" && activeDeliverable !== null && questionsRef.current) {
        const questions = questionsRef.current.getQuestionsData();

        await fetch("/api/rfp-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliverableId: procurement.scopeOfWork[activeDeliverable].id,
            rfpId: procurement.id,
            questions,
          }),
        });
      }
      await refreshProcurement();
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setIsSaving(false);
    }
  };

 const handleNext = async () => {
  await saveCurrentSection();

  if (currentTabIndex < tabs.length - 1) {
    const nextTab = tabs[currentTabIndex + 1];

    const completedCount = Object.values(isComplete).filter(Boolean).length;
    const totalCount = Object.keys(isComplete).length;

    // 🚩 Allow Review only if 5 of 6 sections complete
    if (nextTab === "review" && completedCount < totalCount - 1) {
      alert("Please complete all sections before proceeding to the review page. ");
      return;
    }

    if (nextTab.startsWith("questions-")) {
      setActiveTab("questions");
      setActiveDeliverable(parseInt(nextTab.split("-")[1]));
    } else {
      setActiveTab(nextTab);
      setActiveDeliverable(null);
    }
  }
};



  const handleBack = () => {
    if (currentTabIndex > 0) {
      const prevTab = tabs[currentTabIndex - 1];
      if (prevTab.startsWith("questions-")) {
        setActiveTab("questions");
        setActiveDeliverable(parseInt(prevTab.split("-")[1]));
      } else {
        setActiveTab(prevTab);
        setActiveDeliverable(null);
      }
    }
  };

  const renderContent = () => {
    if (activeTab === "header") return <HeaderSection procurement={procurement} />;
    if (activeTab === "appendix") return <AppendixSection procurement={procurement} />;
    if (activeTab === "supplierList") return <SupplierListSection procurement={procurement} />;
    if (activeTab === "evaluationCriteria")
      return <EvaluationCriteriaSection procurement={procurement} />;
    if (activeTab === "review") return <ReviewSection procurement={procurement} />;
    if (activeTab === "questions") {
      if (activeDeliverable !== null) {
        const sow = procurement.scopeOfWork[activeDeliverable];
        return <QuestionsSection deliverable={sow} ref={questionsRef} />;
      }
      return (
        <div className="text-gray-500 p-4 text-center py-8">
          <p className="text-lg">Select a deliverable to view or edit questions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">RFP Builder</h2>
          <p className="text-sm text-gray-500 mt-1">{procurement.title || "Untitled RFP"}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {/* Navigation Items */}
          <nav className="space-y-1">
            {/* Header */}
            <button
              onClick={() => {
                setActiveTab("header");
                setActiveDeliverable(null);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                activeTab === "header" 
                  ? "bg-blue-50 text-blue-600" 
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex items-center">
                {isComplete.header ? (
                  <FaCheckCircle className="text-green-500 mr-3" />
                ) : (
                  <FaTimesCircle className="text-red-400 mr-3" />
                )}
                <span className="font-medium">Header</span>
              </div>
              <FaChevronRight className="text-gray-400 text-xs" />
            </button>

            {/* Questions Section */}
            <div>
              <button
                onClick={() => {
                  setActiveTab("questions");
                  setActiveDeliverable(null);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  activeTab === "questions" && activeDeliverable === null
                    ? "bg-blue-50 text-blue-600" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  {isComplete.questions ? (
                    <FaCheckCircle className="text-green-500 mr-3" />
                  ) : (
                    <FaTimesCircle className="text-red-400 mr-3" />
                  )}
                  <span className="font-medium">Questions</span>
                </div>
                <FaChevronRight className="text-gray-400 text-xs" />
              </button>

              {/* Deliverable sub-items */}
              <div className="ml-8 mt-1 space-y-1">
                {procurement.scopeOfWork.map((sow: any, idx: number) => (
                  <button
                    key={sow.id}
                    onClick={() => {
                      setActiveTab("questions");
                      setActiveDeliverable(idx);
                    }}
                    className={`w-full flex items-center justify-between p-2 pl-3 rounded-lg transition-colors ${
                      activeTab === "questions" && activeDeliverable === idx
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center">
                      {deliverableComplete[idx] ? (
                        <FaCheckCircle className="text-green-500 mr-3 text-sm" />
                      ) : (
                        <FaTimesCircle className="text-red-400 mr-3 text-sm" />
                      )}
                      <span className="text-sm truncate max-w-[160px]">{sow.title}</span>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full flex items-center p-2 pl-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                >
                  <FaPlus className="mr-3 text-blue-500 text-xs" />
                  <span>Add Section</span>
                </button>
              </div>
            </div>

            {/* Other Sections */}
            {[
              { key: "appendix", label: "Appendix" },
              { key: "supplierList", label: "Supplier List" },
              { key: "evaluationCriteria", label: "Evaluation Criteria" },
              { key: "review", label: "Review & Submit" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
  if (item.key === "review") {
    const completedCount = Object.values(isComplete).filter(Boolean).length;
    const totalCount = Object.keys(isComplete).length;
    if (completedCount < totalCount - 1) {
      alert("Please complete all sections before proceeding to the review page.");
      return;
    }
  }
  setActiveTab(item.key);
  setActiveDeliverable(null);
}}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  activeTab === item.key
                    ? "bg-blue-50 text-blue-600" 
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  {isComplete[item.key as keyof typeof isComplete] ? (
                    <FaCheckCircle className="text-green-500 mr-3" />
                  ) : (
                    <FaTimesCircle className="text-red-400 mr-3" />
                  )}
                  <span className="font-medium">{item.label}</span>
                </div>
                <FaChevronRight className="text-gray-400 text-xs" />
              </button>
            ))}
          </nav>
        </div>

        {/* Progress indicator */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Object.values(isComplete).filter(Boolean).length} of {Object.keys(isComplete).length} sections</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ 
                width: `${(Object.values(isComplete).filter(Boolean).length / Object.keys(isComplete).length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 bg-white rounded-lg m-4 shadow-sm">
          {renderContent()}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-gray-200 bg-white p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {activeTab === "header" && "RFP Header"}
            {activeTab === "questions" && activeDeliverable !== null && `Questions: ${procurement.scopeOfWork[activeDeliverable]?.title}`}
            {activeTab === "questions" && activeDeliverable === null && "Questions"}
            {activeTab === "appendix" && "Appendix"}
            {activeTab === "supplierList" && "Supplier List"}
            {activeTab === "evaluationCriteria" && "Evaluation Criteria"}
            {activeTab === "review" && "Review & Submit"}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              disabled={currentTabIndex === 0 || isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiArrowLeft /> Back
            </button>
            <button
              onClick={saveCurrentSection}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiSave /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleNext}
              disabled={currentTabIndex === tabs.length - 1 || isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next <FiArrowRight />
            </button>
          </div>
        </div>
      </div>

      {/* Add Deliverable Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Deliverable</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                  <input
                    type="text"
                    value={newDeliverableTitle}
                    onChange={(e) => setNewDeliverableTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Deliverable title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newDeliverableDescription}
                    onChange={(e) => setNewDeliverableDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    rows={3}
                    placeholder="Brief description of this deliverable"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsAddingDeliverable(true);
                  try {
                    const res = await fetch("/api/procurement/add-deliverable", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        rfpId: procurement.id,
                        title: newDeliverableTitle,
                        description: newDeliverableDescription,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to add deliverable");
                    await refreshProcurement();
                  } catch (error) {
                    console.error(error);
                    alert("Error adding deliverable");
                  } finally {
                    setIsAddingDeliverable(false);
                    setShowAddModal(false);
                    setNewDeliverableTitle("");
                    setNewDeliverableDescription("");
                  }
                }}
                disabled={isAddingDeliverable || !newDeliverableTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAddingDeliverable ? "Adding..." : "Add Deliverable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}