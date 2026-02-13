
import { NextResponse } from "next/server";

export async function GET() {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML timestamp="${new Date().toISOString()}" payloadID="${Date.now()}@inventory.com">
    <Header>
        <From>
            <Credential domain="NetworkId">
                <Identity>SUPPLIER_ID</Identity>
            </Credential>
        </From>
        <To>
            <Credential domain="NetworkId">
                <Identity>BUYER_ID</Identity>
            </Credential>
        </To>
        <Sender>
            <Credential domain="NetworkId">
                <Identity>SENDER_ID</Identity>
            </Credential>
            <UserAgent>InventorySystem 1.0</UserAgent>
        </Sender>
    </Header>
    <Message>
        <Transaction>
            <Catalog>
                <CatalogHeader operation="update"/>
                <!-- Example Item 1 -->
                <CatalogItem>
                    <SupplierPartID>ITEM-001</SupplierPartID>
                    <ItemDetail>
                        <UnitPrice>
                            <Money currency="USD">100.00</Money>
                        </UnitPrice>
                        <Description xml:lang="en">Premium High-Speed Data Cable</Description>
                        <UnitOfMeasure>EA</UnitOfMeasure>
                        <Classification domain="UNSPSC">43211617</Classification>
                    </ItemDetail>
                </CatalogItem>
                <!-- Example Item 2 -->
                <CatalogItem>
                    <SupplierPartID>ITEM-002</SupplierPartID>
                    <ItemDetail>
                        <UnitPrice>
                            <Money currency="USD">450.50</Money>
                        </UnitPrice>
                        <Description xml:lang="en">Office Desk Chair, Ergonomic</Description>
                        <UnitOfMeasure>EA</UnitOfMeasure>
                        <Classification domain="UNSPSC">56112102</Classification>
                    </ItemDetail>
                </CatalogItem>
            </Catalog>
        </Transaction>
    </Message>
</cXML>`;

    return new NextResponse(xmlContent, {
        headers: {
            "Content-Type": "application/xml",
            "Content-Disposition": 'attachment; filename="catalog_template.xml"',
        },
    });
}
