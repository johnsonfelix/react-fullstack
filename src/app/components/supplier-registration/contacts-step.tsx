// /app/supplier-registration/_components/contacts-step.tsx
"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Trash2 } from "lucide-react";

export default function ContactsStep() {
    const {
        control,
        register,
        setValue,  
        getValues,
        formState: { errors },
    } = useFormContext();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "contacts",
    });

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Contacts</h2>
            <p className="text-sm text-gray-600">
                Enter contact details. Registration communications will be sent to the first contact.
            </p>

            {fields.map((item, index) => (
                <div key={item.id} className="p-6 border border-gray-200 rounded-lg shadow-sm space-y-6 relative bg-white">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-700">Contact {index + 1}</h3>
                        {fields.length > 1 && (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
  remove(index);

  // Ensure the contacts array is marked as dirty (so the save payload includes it)
  // Use getValues to get the up-to-date contacts after the removal
  const currentContacts = getValues("contacts");
  setValue("contacts", currentContacts, { shouldDirty: true, shouldTouch: true });

  // optional marker you already had (not strictly required if the contacts field is dirty)
  setValue("__contactsTouched", true, { shouldDirty: true, shouldTouch: true });
}}
            className="text-red-500 hover:text-red-700"
        >
            <Trash2 className="h-5 w-5" />
        </Button>
    )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor={`contacts.${index}.firstName`}>First Name</Label>
                            <Input id={`contacts.${index}.firstName`} {...register(`contacts.${index}.firstName`)} />
                            {errors.contacts?.[index]?.firstName && <p className="text-red-500 text-xs mt-1">{errors.contacts[index].firstName.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor={`contacts.${index}.lastName`}>Last Name</Label>
                            <Input id={`contacts.${index}.lastName`} {...register(`contacts.${index}.lastName`)} />
                            {errors.contacts?.[index]?.lastName && <p className="text-red-500 text-xs mt-1">{errors.contacts[index].lastName.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor={`contacts.${index}.email`}>Email</Label>
                            <Input id={`contacts.${index}.email`} type="email" {...register(`contacts.${index}.email`)} />
                            {errors.contacts?.[index]?.email && <p className="text-red-500 text-xs mt-1">{errors.contacts[index].email.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor={`contacts.${index}.designation`}>Designation</Label>
                            <Input id={`contacts.${index}.designation`} {...register(`contacts.${index}.designation`)} />
                        </div>
                        <div>
                            <Label htmlFor={`contacts.${index}.country`}>Country Code</Label>
                            <Input id={`contacts.${index}.country`} {...register(`contacts.${index}.country`)} />
                        </div>
                        <div>
                            <Label htmlFor={`contacts.${index}.mobile`}>Mobile</Label>
                            <Input id={`contacts.${index}.mobile`} {...register(`contacts.${index}.mobile`)} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor={`contacts.${index}.phone`}>Phone</Label>
                            <Input id={`contacts.${index}.phone`} {...register(`contacts.${index}.phone`)} />
                        </div>
                        <div>
                            <Label htmlFor={`contacts.${index}.ext`}>Ext</Label>
                            <Input id={`contacts.${index}.ext`} {...register(`contacts.${index}.ext`)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* FIX: Use a fully controlled RadioGroup with value and onValueChange */}
                        <Controller
                            control={control}
                            name={`contacts.${index}.isAdministrativeContact`}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label>Is this an administrative contact?</Label>
                                    <RadioGroup
                                        onValueChange={(value) => field.onChange(value === 'true')}
                                        value={String(field.value)} // Convert boolean to string for the component
                                        className="flex space-x-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="true" id={`admin-yes-${index}`} />
                                            <Label htmlFor={`admin-yes-${index}`}>Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="false" id={`admin-no-${index}`} />
                                            <Label htmlFor={`admin-no-${index}`}>No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}
                        />
                        <Controller
                            control={control}
                            name={`contacts.${index}.needsUserAccount`}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label>Does this contact need a user account?</Label>
                                    <RadioGroup
                                        onValueChange={(value) => field.onChange(value === 'true')}
                                        value={String(field.value)} // Convert boolean to string
                                        className="flex space-x-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="true" id={`user-yes-${index}`} />
                                            <Label htmlFor={`user-yes-${index}`}>Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="false" id={`user-no-${index}`} />
                                            <Label htmlFor={`user-no-${index}`}>No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}
                        />
                    </div>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                onClick={() =>
                    append({
                        firstName: "", lastName: "", email: "", designation: "", country: "IN",
                        mobile: "", phone: "", ext: "", isAdministrativeContact: false, needsUserAccount: false,
                    })
                }
            >
                Add Another Contact
            </Button>
        </div>
    );
}
