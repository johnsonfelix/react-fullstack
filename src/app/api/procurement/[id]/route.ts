import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

// DELETE: Delete a procurement request by ID
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url); // Use standard URL parsing
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1); // Extract [id]

    if (!id) {
      return NextResponse.json({ error: "ID not provided" }, { status: 400 });
    }

    console.log("Attempting to delete ProcurementRequest with ID:", id);

    const existing = await prisma.procurementRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      console.log("ProcurementRequest not found.");
      return NextResponse.json(
        { error: "ProcurementRequest not found" },
        { status: 404 }
      );
    }

    await prisma.procurementRequest.delete({
      where: { id },
    });
    console.log("ProcurementRequest deleted successfully.");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting procurement request:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", detail: JSON.stringify(error) },
      { status: 500 }
    );
  }
}

// GET: Fetch a procurement request by ID
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1);

    if (!id) {
      return NextResponse.json({ error: "ID not provided" }, { status: 400 });
    }

    console.log("Fetching ProcurementRequest with ID:", id);

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        suppliers: true,
        collaborators: true,
        approval: {
          include: {
            steps: { orderBy: { order: 'asc' } }
          }
        },
      },
    });

    if (!procurement) {
      return NextResponse.json(
        { error: "ProcurementRequest not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(procurement, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching procurement request:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", detail: JSON.stringify(error) },
      { status: 500 }
    );
  }
}

// PATCH: Update a procurement request by ID
export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1);

    if (!id) {
      return NextResponse.json({ error: "ID not provided" }, { status: 400 });
    }

    const body = await req.json();
    console.log("Updating ProcurementRequest:", id, body);

    // Filter out fields that shouldn't be updated directly or need mapping
    // Prisma will throw error if we pass unknown fields, but 'body' comes from client which might have extra stuff
    // We explicitly map the fields we allow updating
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.requestType !== undefined) updateData.requestType = body.requestType;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.aiQuestions !== undefined) updateData.aiQuestions = body.aiQuestions;
    if (body.sowSummary !== undefined) updateData.sowSummary = body.sowSummary;
    if (body.deliverables !== undefined) updateData.deliverables = body.deliverables;
    if (body.additionalFields !== undefined) updateData.additionalFields = body.additionalFields;
    // Handle other potentially updated fields like evaluationDetails if bound in UI
    if (body.evaluationDetails !== undefined) updateData.evaluationDetails = body.evaluationDetails;
    if (body.terms !== undefined) updateData.terms = body.terms;
    if (body.procurementLeadId !== undefined) updateData.procurementLeadId = body.procurementLeadId;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;

    // Handle nested items update if provided
    if (body.items) {
      updateData.items = {
        deleteMany: {}, // Clear existing items
        create: body.items.map((item: any) => ({
          title: item.title,
          quantity: Number(item.quantity) || 0,
          uom: item.uom,
          price: item.price ? Number(item.price) : undefined,
          manufacturerPartNo: item.manufacturerPartNo,
          location: item.location,
          attachment: item.attachment,
        })),
      };
    }

    // Handle suppliers update
    // We do this logic *inside* updateData construction or via separate operations. 
    // Prisma implicit m-n update:
    // suppliers: { set: [], connect: [...], create: [...] } works if we want to replace the list.
    if (body.suppliers) {
      const existingIds = body.suppliers
        .filter((s: any) => !s.id.toString().startsWith("manual-"))
        .map((s: any) => ({ id: s.id }));

      const manualSuppliers = body.suppliers
        .filter((s: any) => s.id.toString().startsWith("manual-"));

      updateData.suppliers = {
        set: [], // Clear existing relations to replace with the new list
        connect: existingIds,
        create: manualSuppliers.map((s: any) => ({
          companyName: s.companyName || s.name || "Unknown Company",
          registrationEmail: s.registrationEmail || s.contact?.email || `manual-${Date.now()}@example.com`,
          country: "US", // Default
          organizationType: "Corporation", // Default
          supplierType: "Goods", // Default
          status: "Pending",
          contacts: {
            create: {
              firstName: s.contact?.firstName || "Unknown",
              lastName: s.contact?.lastName || "Unknown",
              email: s.contact?.email || s.registrationEmail || "no-email@example.com",
              countryCode: "+1",
              mobile: "0000000000"
            }
          }
        }))
      };
    }


    // Handle collaborators update
    if (body.collaborators) {
      // Strategy: Delete existing for this ID and re-create (simplest for full list sync)
      // Or smart diff. Let's do simple delete-create for now as the list is small.
      // But we need to be careful not to delete if we are only adding. 
      // The UI sends the full list? Yes, usually.

      updateData.collaborators = {
        deleteMany: {},
        create: body.collaborators.map((c: any) => ({
          name: c.name,
          email: c.email || "",
          role: c.role,
          permissions: c.permissions || [],
          // userId link if available? 
          // userId: c.userId
        }))
      };
    }

    // Handle Approval Updates
    if (body.approval) {
      const {
        steps,
        id,
        procurementRequestId,
        createdAt,
        updatedAt,
        procurementRequest,
        ...approvalSettings
      } = body.approval;

      const approvalUpsert = {
        create: {
          ...approvalSettings,
          steps: {
            create: steps?.map((step: any) => ({
              role: step.role,
              approverName: step.approverName,
              status: step.status,
              slaDuration: step.slaDuration,
              condition: step.condition,
              conditionType: step.conditionType,
              conditionOperator: step.conditionOperator,
              conditionValue: step.conditionValue,
              isRequired: step.isRequired,
              order: step.order
            }))
          }
        },
        update: {
          ...approvalSettings,
          steps: {
            deleteMany: {}, // Simplest approach: Replace all steps
            create: steps?.map((step: any) => ({
              role: step.role,
              approverName: step.approverName,
              status: step.status,
              slaDuration: step.slaDuration,
              condition: step.condition,
              conditionType: step.conditionType,
              conditionOperator: step.conditionOperator,
              conditionValue: step.conditionValue,
              isRequired: step.isRequired,
              order: step.order
            }))
          }
        }
      };

      updateData.approval = {
        upsert: approvalUpsert
      };
    }




    const updated = await prisma.procurementRequest.update({
      where: { id },
      data: updateData,
      include: {
        suppliers: true,
        items: true, // Return items to update client state
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating procurement request:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", detail: JSON.stringify(error) },
      { status: 500 }
    );
  }
}
