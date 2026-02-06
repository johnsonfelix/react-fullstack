"use client"

import React from "react";
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { Trash2 } from "lucide-react";

export default function AddressesStep() {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "addresses" });

  // Watch contacts from the form state to list them for association
  const contacts = watch("contacts") || [];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Addresses</h2>
      <p className="text-sm text-gray-600">
        Enter at least one address.
      </p>

      {fields.map((field, index) => (
        <div key={field.id} className="p-6 border border-gray-200 rounded-lg shadow-sm space-y-6 relative bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Address {index + 1}</h3>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  remove(index);
                  // mark that user changed addresses explicitly (including deletions)
                  setValue("__addressesTouched", true, { shouldDirty: true, shouldTouch: true });
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="col-span-1">
              <Label htmlFor={`addresses.${index}.type`}>Address Type</Label>
              <Input
                id={`addresses.${index}.type`}
                placeholder="e.g., HQ, BRANCH"
                {...register(`addresses.${index}.type`)}
              />
            </div>
            <div className="col-span-2">
              <Label>What's this address used for?</Label>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name={`addresses.${index}.usage.receivePurchaseOrders`}
                    render={({ field }) => (
                      <Checkbox id={`usage-po-${index}`} onCheckedChange={field.onChange} checked={!!field.value} />
                    )}
                  />
                  <Label htmlFor={`usage-po-${index}`} className="font-normal">Receive Purchase Orders</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name={`addresses.${index}.usage.receivePayments`}
                    render={({ field }) => (
                      <Checkbox id={`usage-rp-${index}`} onCheckedChange={field.onChange} checked={!!field.value} />
                    )}
                  />
                  <Label htmlFor={`usage-rp-${index}`} className="font-normal">Receive Payments</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name={`addresses.${index}.usage.bidOnRFQs`}
                    render={({ field }) => (
                      <Checkbox id={`usage-rfq-${index}`} onCheckedChange={field.onChange} checked={!!field.value} />
                    )}
                  />
                  <Label htmlFor={`usage-rfq-${index}`} className="font-normal">Bid on RFQs</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input placeholder="Address Line 1" {...register(`addresses.${index}.line1`)} />
              <Input placeholder="Address Line 2" {...register(`addresses.${index}.line2`)} />
              <Input placeholder="Address Line 3" {...register(`addresses.${index}.line3`)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input placeholder="City or Town" {...register(`addresses.${index}.city`)} />
              <Input placeholder="Pin Code" {...register(`addresses.${index}.postalCode`)} />
              <Input placeholder="State" {...register(`addresses.${index}.state`)} />
            </div>
          </div>

          <fieldset className="pt-4 border-t">
            <legend className="text-md font-semibold mb-3">Which contacts are associated to this address?</legend>
            <div className="space-y-3">
              {contacts.map((contact: any, contactIndex: number) => (
                <div key={contactIndex} className="flex items-center space-x-3">
                  <Controller
                    control={control}
                    name={`addresses.${index}.associatedContacts`}
                    render={({ field }) => {
                      const current = Array.isArray(field.value) ? field.value : [];
                      const identifier = contact.id || contact.email;
                      const checked = current.includes(identifier);
                      return (
                        <Checkbox
                          onCheckedChange={(checked) => {
                            const newValues = checked
                              ? [...current, identifier]
                              : current.filter((val: string) => val !== identifier);
                            field.onChange(newValues);
                          }}
                          checked={checked}
                        />
                      );
                    }}
                  />
                  <Label className="font-normal flex-1">
                    {contact.firstName} {contact.lastName} ({contact.email})
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>

        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            type: "",
            usage: { receivePurchaseOrders: false, receivePayments: false, bidOnRFQs: false },
            line1: "", line2: "", line3: "",
            city: "", postalCode: "", state: "",
            country: "IN",
            associatedContacts: []
          })
        }
      >
        Add Another Address
      </Button>
    </div>
  );
}
