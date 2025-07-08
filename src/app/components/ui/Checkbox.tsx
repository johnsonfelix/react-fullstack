"use client";

import { useState } from "react";

export default function Checkbox({ id, checked, onCheckedChange }:any) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
    />
  );
}
