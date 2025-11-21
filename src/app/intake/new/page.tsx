"use client";

import { useState } from "react";
import FuturisticProcurementBot from "./SlideWhatYouWant";
import SlideRequestTypeCategory from "./SlideRequestTypeCategory";
import SlideAddress from "./SlideAddress";
import SlideGoods from "./SlideGoods";
import SlideScopeOfWork from "./SlideScopeOfWork";
import SlideAIQuestions from "./SlideAIQuestions";
import SlideReview from "./SlideReview";

export default function NewProcurementPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [procurementDraft, setProcurementDraft] = useState<any>({
    items: [],
    description: "",
    requestType: "", // "goods" | "service"
    category: "",
    address: "",
    scopeOfWork: "",
  });

  // Named slide indexes to make branching clear
  const SLIDES = {
    WHAT: 0,
    REQTYPE: 1,
    ADDRESS: 2,
    GOODS: 3,
    SCOPE: 4,
    AIQ: 5,
    REVIEW: 6,
  };

  const next = (overrideIndex?: number) =>
    setCurrentSlide((s) => (typeof overrideIndex === "number" ? overrideIndex : Math.min(6, s + 1)));
  const prev = () => setCurrentSlide((s) => Math.max(0, s - 1));

  return (
    <div className="max-w-3xl mx-auto p-8">
      {currentSlide === SLIDES.WHAT && (
  <FuturisticProcurementBot
    procurementDraft={procurementDraft}
    setProcurementDraft={setProcurementDraft}
    next={next}
    SLIDES={SLIDES} // <-- pass SLIDES so child can jump to specific slide indexes
  />
)}

      {currentSlide === SLIDES.REQTYPE && (
        <SlideRequestTypeCategory
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
        />
      )}

      {currentSlide === SLIDES.ADDRESS && (
        <SlideAddress
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
          SLIDES={SLIDES}
        />
      )}

      {currentSlide === SLIDES.GOODS && (
        <SlideGoods 
          procurementDraft={procurementDraft} 
          setProcurementDraft={setProcurementDraft} 
          next={next} 
          prev={prev} 
        />
      )}

      {currentSlide === SLIDES.SCOPE && (
        <SlideScopeOfWork
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
        />
      )}

      {currentSlide === SLIDES.AIQ && (
        <SlideAIQuestions 
          procurementDraft={procurementDraft} 
          setProcurementDraft={setProcurementDraft} 
          next={next} 
          prev={prev} 
        />
      )}

      {currentSlide === SLIDES.REVIEW && (
        <SlideReview 
          procurementDraft={procurementDraft} 
          prev={prev} 
        />
      )}
    </div>
  );
}