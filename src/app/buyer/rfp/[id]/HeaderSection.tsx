"use client";

import { Button } from "@/app/components/ui/button";
import Checkbox from "@/app/components/ui/Checkbox";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textArea";
import { Label } from "@radix-ui/react-label";
import { useState } from "react";
import { useEffect } from "react";

// ✅ Clean reusable Modal for NDA
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
        {children}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default function HeaderSection({ procurement }: any) {
  const [description, setDescription] = useState(procurement.description || "");
  const [editMode, setEditMode] = useState(false);
  const [ndaChecked, setNdaChecked] = useState(false);
  const [showNdaPolicy, setShowNdaPolicy] = useState(false);

  useEffect(() => {
  const loadProcurement = async () => {
    if (!procurement.id) return; // skip if creating new

    try {
      const res = await fetch(`/api/procurement/procurement-request?id=${procurement.id}`);
      if (res.ok) {
        const data = await res.json();
        setDescription(data.description || "");
        setFormData((prev) => ({
          ...prev,
          category: data.category,
          address: data.address,
          ...(data.additionalFields || {}),
        }));
      } else {
        console.error("Failed to load procurement request");
      }
    } catch (error) {
      console.error(error);
    }
  };

  loadProcurement();
}, [procurement.id]);

  const [formData, setFormData] = useState({
    scheduledPublishDate: "",
    scheduledPublishTime: "",
    closeDate: "",
    closeTime: "",
    questionDueDate: "",
    questionDueTime: "",
    plannedPurchaseDate: "",
    currency: "",
    department: "",
    shippingType: "",
    carrier: "",
    address: procurement.address || "",
    category: procurement.category || "",
    eventJustification: "",
    valueOfEvent: "",
    projectSavings: "",
  });

  const handleSave = async () => {
  try {
    const payload = {
      id: procurement.id, // pass the ID to update
      title: procurement.title,
      description,
      requestType: procurement.requestType,
      category: formData.category,
      address: formData.address,
      status: "draft",
      additionalFields: {
        scheduledPublishDate: formData.scheduledPublishDate,
        scheduledPublishTime: formData.scheduledPublishTime,
        closeDate: formData.closeDate,
        closeTime: formData.closeTime,
        questionDueDate: formData.questionDueDate,
        questionDueTime: formData.questionDueTime,
        plannedPurchaseDate: formData.plannedPurchaseDate,
        currency: formData.currency,
        department: formData.department,
        shippingType: formData.shippingType,
        carrier: formData.carrier,
        eventJustification: formData.eventJustification,
        valueOfEvent: formData.valueOfEvent,
        projectSavings: formData.projectSavings,
      },
    };

    const res = await fetch("/api/procurement/procurement-request", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert("Procurement request updated successfully.");
    } else {
      const error = await res.json();
      console.error(error);
      alert("Failed to update procurement request.");
    }
  } catch (error) {
    console.error(error);
    alert("Error updating procurement request.");
  }
};


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* 📌 Title & Description */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">{procurement.title}</h2>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!editMode}
          className="mb-2"
        />
        <Button onClick={() => setEditMode(!editMode)}>
          {editMode ? "Save Description" : "Edit Description"}
        </Button>
      </div>

      {/* 📌 Date & Time Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Scheduled Publish Date", name: "scheduledPublishDate", type: "date" },
          { label: "Scheduled Publish Time", name: "scheduledPublishTime", type: "time" },
          { label: "Close Date", name: "closeDate", type: "date" },
          { label: "Close Time", name: "closeTime", type: "time" },
          { label: "Question Due Date", name: "questionDueDate", type: "date" },
          { label: "Question Due Time", name: "questionDueTime", type: "time" },
          { label: "Planned Purchase Date", name: "plannedPurchaseDate", type: "date" },
          { label: "Currency", name: "currency", type: "text" },
          { label: "Department", name: "department", type: "text" },
          { label: "Shipping Type", name: "shippingType", type: "text" },
          { label: "Carrier", name: "carrier", type: "text" },
        ].map((field) => (
          <div key={field.name} className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">{field.label}</label>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name as keyof typeof formData]}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={["scheduledPublishDate", "scheduledPublishTime", "closeDate", "closeTime"].includes(field.name)}
            />
          </div>
        ))}
      </div>

      {/* 📌 Address & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white shadow rounded-md">
          <Label>Address</Label>
          <Input
            placeholder="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        <div className="p-4 bg-white shadow rounded-md">
          <Label>Category</Label>
          <Input
            placeholder="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* 📌 Internal Details */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Internal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white shadow rounded-md">
            <Label>Event Justification</Label>
            <Input
              placeholder="Event Justification"
              name="eventJustification"
              value={formData.eventJustification}
              onChange={handleChange}
            />
          </div>
          <div className="p-4 bg-white shadow rounded-md">
            <Label>Value of Event</Label>
            <Input
              placeholder="Value of Event"
              name="valueOfEvent"
              value={formData.valueOfEvent}
              onChange={handleChange}
            />
          </div>
          <div className="p-4 bg-white shadow rounded-md">
            <Label>Project Savings</Label>
            <Input
              placeholder="Project Savings"
              name="projectSavings"
              value={formData.projectSavings}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* 📌 NDA Section */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Non-disclosure Agreement (NDA)</h3>
        <div className="flex items-center space-x-2">
          <Checkbox id="nda" checked={ndaChecked} onCheckedChange={setNdaChecked} />
          <Label htmlFor="nda" className="cursor-pointer">
            Suppliers must agree to the terms of the NDA to view this event
          </Label>
        </div>
        {ndaChecked && (
          <Button className="mt-2" onClick={() => setShowNdaPolicy(true)}>
            View Your Company NDA Policy
          </Button>
        )}
      </div>

      <Button onClick={handleSave} className="mt-4">
  Save Procurement Request
</Button>

      {/* 📌 NDA Policy Modal */}
      <Modal open={showNdaPolicy} onClose={() => setShowNdaPolicy(false)}>
        <h3 className="text-lg font-semibold mb-2">Your Company NDA Policy</h3>
        <p className="text-sm text-gray-600">
          [Your NDA policy text goes here. You can fetch this dynamically if needed.]
        </p>
        <Button onClick={() => setShowNdaPolicy(false)} className="mt-4">
          Close
        </Button>
      </Modal>
    </div>
  );
}
