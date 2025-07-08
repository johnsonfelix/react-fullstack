"use client";

import React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DatePicker({
  selected,
  onChange,
  showTimeOnly = false,
  className = "w-full p-2 border rounded",
}:any) {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      showTimeSelect={showTimeOnly}
      showTimeSelectOnly={showTimeOnly}
      timeIntervals={15}
      timeCaption="Time"
      dateFormat={showTimeOnly ? "h:mm aa" : "MM/dd/yyyy"}
      className={className}
    />
  );
}
