// Read-only AWS public catalog query. No AWS credentials or account APIs.
import { writeFile } from "node:fs/promises";
function csv(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      fields.push(field);
      field = "";
    } else field += c;
  }
  fields.push(field.replace(/\r$/, ""));
  return fields;
}
const collected = [];
for (const region of ["us-east-1", "sa-east-1"]) {
  const url = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${region}/index.csv`;
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`AWS catalog HTTP ${response.status}`);
  const result = {
    region,
    url,
    retrievedAt: new Date().toISOString(),
    metadata: [],
    rows: [],
  };
  let buffer = "";
  let headers;
  for await (const chunk of response.body) {
    buffer += Buffer.from(chunk).toString("utf8");
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (!headers) {
        if (line.startsWith('"SKU"')) headers = csv(line);
        else result.metadata.push(csv(line));
        continue;
      }
      if (line.includes(',"Reserved",')) {
        continue;
      }
      if (
        !/t4g\.(medium|large)|VolumeUsage\.gp3|EBS:SnapshotUsage"|DataTransfer-Out-Bytes/.test(
          line,
        )
      )
        continue;
      const row = Object.fromEntries(csv(line).map((v, i) => [headers[i], v]));
      if (row.TermType !== "OnDemand") continue;
      if (
        row["Product Family"] === "Compute Instance" &&
        (row.Tenancy !== "Shared" ||
          row["Operating System"] !== "Linux" ||
          row["Pre Installed S/W"] !== "NA" ||
          row.CapacityStatus !== "Used")
      )
        continue;
      if (
        row["Product Family"] === "Compute Instance" &&
        !["t4g.medium", "t4g.large"].includes(row["Instance Type"])
      )
        continue;
      if (
        row["Product Family"] === "Data Transfer" &&
        row["Transfer Type"] !== "AWS Outbound"
      )
        continue;
      result.rows.push(row);
    }
  }
  collected.push(result);
  await writeFile(
    new URL(
      "../../docs/audits/evidence/2026-10-13/aws-prices.json",
      import.meta.url,
    ),
    JSON.stringify(collected, null, 2) + "\n",
  );
  console.log(
    region,
    result.rows
      .map((r) => `${r.usageType}: ${r.PricePerUnit} ${r.Unit}`)
      .join("\n"),
  );
}
