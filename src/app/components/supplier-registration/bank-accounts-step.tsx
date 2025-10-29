"use client";

import React, { useEffect } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BankAccountsStep() {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "bankAccounts" });

  // default empty bank account row
  const emptyBank = {
    country: "India",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountHolderName: "",
    iban: "",
    swiftCode: "",
    currency: "Indian Rupee (INR)",
    accountType: "Savings",
  };

  // Ensure there's always at least one visible row (do NOT mark touched here)
  useEffect(() => {
    if (fields.length === 0) {
      append(emptyBank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  // Placeholder options
  const countryOptions = ["India", "USA", "UAE"];
  const bankOptions = ["ICICI", "HDFC Bank", "State Bank of India"];
  const currencyOptions = ["Indian Rupee (INR)", "US Dollar (USD)"];
  const accountTypeOptions = ["Savings", "Checking", "Escrow"];

  const removeBankAccount = (index: number) => {
    // remove and if result becomes empty, append a blank row so UI remains visible
    remove(index);
    if (fields.length <= 1) {
      // append after a tick to let remove finish (safe, simple)
      setTimeout(() => append(emptyBank), 0);
    }
    // Optionally mark touched: setValue("__bankAccountsTouched", true, { shouldDirty: true });
    setValue("__bankAccountsTouched", true, { shouldDirty: true });

  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Bank Accounts</h2>
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
        <p className="font-bold">Instructions to create Bank Accounts</p>
        <ul className="list-disc list-inside text-sm">
          <li>If you face any issues, please contact supplier@g.com.</li>
          <li>Do not enter special characters (e.g., @, #, $, %) in the fields.</li>
          <li>Currency field must be selected as per Bank letter. Do not keep it blank.</li>
        </ul>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="p-6 border border-gray-200 rounded-lg shadow-sm space-y-6 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Bank account {index + 1}</h3>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBankAccount(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Controller
              control={control}
              name={`bankAccounts.${index}.country`}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    onValueChange={(val) => field.onChange(val)}
                    value={field.value}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent>
                      {countryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name={`bankAccounts.${index}.bankName`}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select onValueChange={(val) => field.onChange(val)} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select a bank" /></SelectTrigger>
                    <SelectContent>
                      {bankOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <div>
              <Label>Bank Branch</Label>
              <Input placeholder="e.g., MUMBAI INDIA" {...register(`bankAccounts.${index}.bankBranch`)} />
            </div>

            <div>
              <Label>Account Number</Label>
              <Input placeholder="Account Number" {...register(`bankAccounts.${index}.accountNumber`)} />
            </div>

            <Controller
              control={control}
              name={`bankAccounts.${index}.currency`}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select onValueChange={(val) => field.onChange(val)} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select a currency" /></SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name={`bankAccounts.${index}.accountType`}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select onValueChange={(val) => field.onChange(val)} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select an account type" /></SelectTrigger>
                    <SelectContent>
                      {accountTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <div>
              <Label>Account Holder</Label>
              <Input placeholder="Account Holder Name" {...register(`bankAccounts.${index}.accountHolderName`)} />
            </div>

            <div>
              <Label>IBAN (optional)</Label>
              <Input placeholder="IBAN" {...register(`bankAccounts.${index}.iban`)} />
            </div>

            <div>
              <Label>SWIFT / BIC (optional)</Label>
              <Input placeholder="SWIFT / BIC" {...register(`bankAccounts.${index}.swiftCode`)} />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append(emptyBank)}
      >
        Add Another Bank Account
      </Button>
    </div>
  );
}
