"use client";

import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import axios from "axios";
import { FaTrash, FaQuestionCircle } from "react-icons/fa";

type SubComponentType = {
  description: string;
  quantity: string;
  benchmark: string;
  required: boolean;
};

type ConditionalType = {
  operator: string;
  conditionValue: string;
  subComponent: SubComponentType;
};

type ComponentType = {
  label: string;
  description: string;
  uom: string;
  quantity: string;
  benchmark: string;
  required: boolean;
  conditional?: ConditionalType;
};

type ServiceType = {
  name: string;
  components: ComponentType[];
};

type ItemFieldType = {
  description: string;
  uom: string;
  quantity: string;
  benchmark: string;
  required: boolean;
};

const QuestionsSection = forwardRef(function QuestionsSection(
  { deliverable }: { deliverable: any },
  ref
) {
  const [options, setOptions] = useState<{
    uoms: { id: string; name: string }[];
  }>({ uoms: [] });

  const [aiFields, setAiFields] = useState<string[]>([]);
  const [itemFields, setItemFields] = useState<ItemFieldType[]>([]);
  const [serviceFields, setServiceFields] = useState<ServiceType[]>([]);

  useEffect(() => {
  return () => {
    setAiFields([]);
    setItemFields([]);
    setServiceFields([]);
  };
}, []);


 useEffect(() => {
  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`/api/rfp-questions?deliverableId=${deliverable.id}`);
      const questions = res.data;

      const ai: string[] = [];
      const item: ItemFieldType[] = [];
      const service: ServiceType[] = [];

      questions.forEach((q: any) => {
        if ((q.serviceType === "service") || q.serviceName || (q.subQuestions && q.subQuestions.length > 0)) {
          const serviceItem: ServiceType = {
            name: q.serviceName || q.text,
            components: [],
          };

          for (const comp of q.subQuestions) {
            const component: ComponentType = {
              label: "",
              description: comp.text,
              uom: comp.uom ?? "",
              quantity: comp.quantity?.toString() ?? "",
              benchmark: comp.benchmark ?? "",
              required: comp.required ?? false,
            };

            if (comp.subQuestions && comp.subQuestions.length > 0) {
              const sub = comp.subQuestions[0];
              component.conditional = {
                operator: comp.conditionOperator ?? "equal to",
                conditionValue: comp.conditionValue ?? "Yes",
                subComponent: {
                  description: sub.text,
                  quantity: sub.quantity?.toString() ?? "",
                  benchmark: sub.benchmark ?? "",
                  required: sub.required ?? false,
                },
              };
            }

            serviceItem.components.push(component);
          }

          serviceItem.components = serviceItem.components.map((c, idx) => ({
            ...c,
            label: String.fromCharCode(97 + idx),
          }));

          service.push(serviceItem);
        } else if (q.type === "text" && !q.quantity && !q.uom && !q.benchmark && !q.parentQuestionId) {
          ai.push(q.text);
        } else {
          item.push({
            description: q.text,
            uom: q.uom ?? "",
            quantity: q.quantity?.toString() ?? "",
            benchmark: q.benchmark ?? "",
            required: q.required ?? false,
          });
        }
      });

      setAiFields(ai);
      setItemFields(item);
      setServiceFields(service);
    } catch (err) {
      console.error("Error fetching questions:", err);
    }
  };

  fetchQuestions();
}, [deliverable.id]);


  

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await axios.get("/api/options/brfq");
        setOptions(res.data);
      } catch (err) {
        console.error("Error fetching options:", err);
      }
    };
    fetchOptions();
  }, []);

  useImperativeHandle(ref, () => ({
    getQuestionsData: () => {
      const questions: any[] = [];

      aiFields.forEach((q) => {
        questions.push({
          text: q,
          type: "text",
          required: false,
        });
      });

      itemFields.forEach((item) => {
        questions.push({
          text: item.description,
          type: "text",
          required: item.required,
          quantity: item.quantity ? parseInt(item.quantity) : null,
          uom: item.uom || null,
          benchmark: item.benchmark || null,
        });
      });

      serviceFields.forEach(service => {
  questions.push({
    text: service.name,
    type: "text",
    required: false,
    serviceName: service.name,
    serviceType: "service",
    components: service.components.map(comp => ({
      description: comp.description,
      uom: comp.uom,
      quantity: comp.quantity,
      benchmark: comp.benchmark,
      required: comp.required,
      conditional: comp.conditional ? {
        operator: comp.conditional.operator,
        conditionValue: comp.conditional.conditionValue,
        subComponent: {
          description: comp.conditional.subComponent.description,
          quantity: comp.conditional.subComponent.quantity,
          benchmark: comp.conditional.subComponent.benchmark,
          required: comp.conditional.subComponent.required
        }
      } : null
    }))
  });
});


      return questions.map((q) => ({
        ...q,
        deliverableId: deliverable.id,
        rfpId: deliverable.procurementId,
      }));
    },
  }));

  const addAiField = () => setAiFields((prev) => [...prev, ""]);
  const addItemField = () =>
    setItemFields((prev) => [
      ...prev,
      {
        description: "",
        uom: "",
        quantity: "",
        benchmark: "",
        required: false,
      },
    ]);
  const addServiceField = () =>
    setServiceFields((prev) => [...prev, { name: "", components: [] }]);

  const removeAiField = (idx: number) =>
    setAiFields((prev) => prev.filter((_, i) => i !== idx));
  const removeItemField = (idx: number) =>
    setItemFields((prev) => prev.filter((_, i) => i !== idx));
  const removeServiceField = (idx: number) =>
    setServiceFields((prev) => prev.filter((_, i) => i !== idx));

  const addComponentToService = (sIdx: number) => {
    setServiceFields((prev) => {
      const updated = structuredClone(prev);
      const currentService = updated[sIdx];
      const label = String.fromCharCode(97 + currentService.components.length);
      currentService.components.push({
        label,
        description: "",
        uom: "",
        quantity: "",
        benchmark: "",
        required: false,
      });
      return updated;
    });
  };

  const removeComponentFromService = (sIdx: number, cIdx: number) => {
    setServiceFields((prev) => {
      const updated = structuredClone(prev);
      updated[sIdx].components.splice(cIdx, 1);
      updated[sIdx].components = updated[sIdx].components.map((comp, idx) => ({
        ...comp,
        label: String.fromCharCode(97 + idx),
      }));
      return updated;
    });
  };

  const handleComponentChange = (
    sIdx: number,
    cIdx: number,
    field: keyof ComponentType,
    value: any
  ) => {
    setServiceFields((prev) => {
      const updated = structuredClone(prev);
      (updated[sIdx].components[cIdx] as any)[field] = value;
      return updated;
    });
  };

  const handleAddConditional = (sIdx: number, cIdx: number) => {
    setServiceFields((prev) => {
      const updated = structuredClone(prev);
      updated[sIdx].components[cIdx].conditional = {
        operator: "equal to",
        conditionValue: "Yes",
        subComponent: {
          description: "",
          quantity: "",
          benchmark: "",
          required: false,
        },
      };
      return updated;
    });
  };

  const handleConditionalChange = (
    sIdx: number,
    cIdx: number,
    field: keyof SubComponentType,
    value: any
  ) => {
    setServiceFields((prev) => {
      const updated = structuredClone(prev);
      const comp = updated[sIdx].components[cIdx];

      if (!comp.conditional) {
        comp.conditional = {
          operator: "equal to",
          conditionValue: "Yes",
          subComponent: {
            description: "",
            quantity: "",
            benchmark: "",
            required: false,
          },
        };
      }

      if (field === "required") {
        comp.conditional.subComponent[field] = value as boolean;
      } else {
        comp.conditional.subComponent[field] = value as string;
      }

      return updated;
    });
  };

  const handleConditionalOperatorChange = (
  sIdx: number,
  cIdx: number,
  value: string
) => {
  setServiceFields((prev) => {
    const updated = structuredClone(prev);
    const comp = updated[sIdx].components[cIdx];
    if (!comp.conditional) {
      comp.conditional = {
        operator: "equal to",
        conditionValue: "Yes",
        subComponent: {
          description: "",
          quantity: "",
          benchmark: "",
          required: false,
        },
      };
    }
    comp.conditional.operator = value ?? "equal to";
    return updated;
  });
};


  const handleConditionValueChange = (
    sIdx: number,
    cIdx: number,
    value: string
  ) => {
    setServiceFields((prev) => {
      const updated = structuredClone(prev);
      const comp = updated[sIdx].components[cIdx];
      if (!comp.conditional) {
        comp.conditional = {
          operator: "equal to",
          conditionValue: "Yes",
          subComponent: {
            description: "",
            quantity: "",
            benchmark: "",
            required: false,
          },
        };
      }
      comp.conditional.conditionValue = value ?? "Yes";
      return updated;
    });
  };

  let questionCounter = 1;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">{deliverable.title}</h2>
      <p className="text-gray-600">{deliverable.description}</p>

      {aiFields.length === 0 &&
        itemFields.length === 0 &&
        serviceFields.length === 0 && (
          <div className="text-center text-gray-400 mt-4">
            <FaQuestionCircle className="text-4xl mx-auto mb-2" />
            Section must include at least one question.
          </div>
        )}

      {aiFields.map((field, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="font-semibold">{`Q${questionCounter++}.`}</span>
          <input
            type="text"
            placeholder="Enter AI Question"
            value={field}
            onChange={(e) => {
              const updated = [...aiFields];
              updated[idx] = e.target.value;
              setAiFields(updated);
            }}
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={() => removeAiField(idx)}
            className="p-2 bg-red-500 text-white rounded"
          >
            <FaTrash />
          </button>
        </div>
      ))}

      {itemFields.map((item, idx) => (
        <div
          key={idx}
          className="p-3 border rounded bg-gray-50 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{`Q${questionCounter++}.`}</span>
            <input
              type="text"
              placeholder="Item Question Description"
              value={item.description}
              onChange={(e) => {
                const updated = structuredClone(itemFields);
                updated[idx].description = e.target.value;
                setItemFields(updated);
              }}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={() => removeItemField(idx)}
              className="p-2 bg-red-500 text-white rounded"
            >
              <FaTrash />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={item.uom}
              onChange={(e) => {
                const updated = structuredClone(itemFields);
                updated[idx].uom = e.target.value;
                setItemFields(updated);
              }}
              className="p-2 border rounded"
            >
              <option value="">Select UOM</option>
              {options.uoms.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Quantity"
              value={item.quantity}
              onChange={(e) => {
                const updated = structuredClone(itemFields);
                updated[idx].quantity = e.target.value;
                setItemFields(updated);
              }}
              className="p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Benchmark"
              value={item.benchmark}
              onChange={(e) => {
                const updated = structuredClone(itemFields);
                updated[idx].benchmark = e.target.value;
                setItemFields(updated);
              }}
              className="p-2 border rounded"
            />
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={item.required}
                onChange={(e) => {
                  const updated = structuredClone(itemFields);
                  updated[idx].required = e.target.checked;
                  setItemFields(updated);
                }}
              />
              Required
            </label>
          </div>
        </div>
      ))}

      {serviceFields.map((service, sIdx) => (
        <div
          key={sIdx}
          className="border p-4 rounded bg-gray-50 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{`Q${questionCounter++}.`}</span>
            <input
              type="text"
              placeholder="Service Question Name"
              value={service.name}
              onChange={(e) => {
                const updated = structuredClone(serviceFields);
                updated[sIdx].name = e.target.value;
                setServiceFields(updated);
              }}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={() => removeServiceField(sIdx)}
              className="p-2 bg-red-500 text-white rounded"
            >
              <FaTrash />
            </button>
          </div>

          {service.components.map((comp, cIdx) => (
            <div
              key={cIdx}
              className="border p-3 bg-white rounded space-y-2"
            >
              <div className="flex justify-between items-center">
                <p className="font-medium">
                  Component {comp.label.toUpperCase()}
                </p>
                <button
                  onClick={() => removeComponentFromService(sIdx, cIdx)}
                  className="p-1 bg-red-500 text-white rounded"
                >
                  <FaTrash />
                </button>
              </div>

              <input
                type="text"
                placeholder="Component Description"
                value={comp.description}
                onChange={(e) =>
                  handleComponentChange(
                    sIdx,
                    cIdx,
                    "description",
                    e.target.value
                  )
                }
                className="w-full p-2 border rounded"
              />

              <div className="flex flex-wrap gap-2">
                <select
                  value={comp.uom}
                  onChange={(e) =>
                    handleComponentChange(sIdx, cIdx, "uom", e.target.value)
                  }
                  className="p-2 border rounded"
                >
                  <option value="">Select UOM</option>
                  {options.uoms.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Quantity"
                  value={comp.quantity}
                  onChange={(e) =>
                    handleComponentChange(
                      sIdx,
                      cIdx,
                      "quantity",
                      e.target.value
                    )
                  }
                  className="p-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Benchmark"
                  value={comp.benchmark}
                  onChange={(e) =>
                    handleComponentChange(
                      sIdx,
                      cIdx,
                      "benchmark",
                      e.target.value
                    )
                  }
                  className="p-2 border rounded"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={comp.required}
                    onChange={(e) =>
                      handleComponentChange(
                        sIdx,
                        cIdx,
                        "required",
                        e.target.checked
                      )
                    }
                  />
                  Required
                </label>
              </div>

              {comp.uom.trim().toLowerCase() === "yes/no" &&
                !comp.conditional && (
                  <button
                    onClick={() => handleAddConditional(sIdx, cIdx)}
                    className="px-2 py-1 bg-purple-600 text-white rounded text-sm"
                  >
                    Add Conditional
                  </button>
                )}

              {comp.conditional && (
                <div className="p-2 border rounded bg-gray-100 space-y-2">
                  <div className="flex gap-2 items-center">
  If answer
  <select
    value={comp.conditional.operator}
    onChange={(e) =>
      handleConditionalOperatorChange(
        sIdx,
        cIdx,
        e.target.value
      )
    }
    className="p-1 border rounded"
  >
    <option value="equal to">equal to</option>
    <option value="not equal to">not equal to</option>
  </select>
  <select
    value={comp.conditional.conditionValue}
    onChange={(e) =>
      handleConditionValueChange(
        sIdx,
        cIdx,
        e.target.value
      )
    }
    className="p-1 border rounded"
  >
    <option value="Yes">Yes</option>
    <option value="No">No</option>
  </select>
  then ask:
</div>


                  <input
                    type="text"
                    placeholder="Sub-component Description"
                    value={comp.conditional.subComponent.description}
                    onChange={(e) =>
                      handleConditionalChange(
                        sIdx,
                        cIdx,
                        "description",
                        e.target.value
                      )
                    }
                    className="w-full p-2 border rounded"
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={comp.conditional.subComponent.quantity}
                      onChange={(e) =>
                        handleConditionalChange(
                          sIdx,
                          cIdx,
                          "quantity",
                          e.target.value
                        )
                      }
                      className="p-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Benchmark"
                      value={comp.conditional.subComponent.benchmark}
                      onChange={(e) =>
                        handleConditionalChange(
                          sIdx,
                          cIdx,
                          "benchmark",
                          e.target.value
                        )
                      }
                      className="p-2 border rounded"
                    />
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={comp.conditional.subComponent.required}
                        onChange={(e) =>
                          handleConditionalChange(
                            sIdx,
                            cIdx,
                            "required",
                            e.target.checked
                          )
                        }
                      />
                      Required
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => addComponentToService(sIdx)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            + Add Component
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 mt-8">
        <button
          onClick={addAiField}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add AI Question
        </button>
        <button
          onClick={addItemField}
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          Add Item Question
        </button>
        <button
          onClick={addServiceField}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Add Service Question
        </button>
      </div>
    </div>
  );
});

QuestionsSection.displayName = "QuestionsSection";

export default QuestionsSection;
