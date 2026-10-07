import { StoredClientFile } from '../types';

export const INITIAL_CLIENT_FILES: StoredClientFile[] = [
  {
    id: 'file-101',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    file_name: 'Apex_Master_Service_Agreement_2026.pdf',
    category: 'Uploaded Document',
    file_type: 'pdf',
    file_size: '420 KB',
    uploaded_at: '2026-03-15',
    uploaded_by: 'Varun Admin',
    tag: 'Service Agreement',
    reference_type: 'upload'
  },
  {
    id: 'file-102',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    file_name: 'Hosting_SLA_Technical_Matrix.table',
    category: 'Custom Table',
    file_type: 'table',
    file_size: '28 KB',
    uploaded_at: '2026-03-18',
    uploaded_by: 'Varun Admin',
    tag: 'Technical Matrix',
    reference_type: 'custom_table',
    table_data: {
      id: 'tbl-apex-1',
      title: 'Hosting SLA & Infrastructure Milestones',
      description: 'Hostinger Cloud VPS node specifications, uptime targets, and failover schedule.',
      columns: [
        { id: 'c1', header: 'Node Component', align: 'left' },
        { id: 'c2', header: 'Specification', align: 'left' },
        { id: 'c3', header: 'Uptime Target', align: 'center' },
        { id: 'c4', header: 'Maintenance Window', align: 'center' },
        { id: 'c5', header: 'Status', align: 'center' }
      ],
      rows: [
        {
          id: 'r1',
          cells: {
            c1: { id: 'r1-c1', content: 'Primary Application Server', bold: true },
            c2: { id: 'r1-c2', content: 'Hostinger Cloud Enterprise 8 vCPU / 32GB RAM' },
            c3: { id: 'r1-c3', content: '99.95%' },
            c4: { id: 'r1-c4', content: 'Sundays 02:00 - 04:00 AM IST' },
            c5: { id: 'r1-c5', content: 'Operational', bold: true }
          }
        },
        {
          id: 'r2',
          cells: {
            c1: { id: 'r2-c1', content: 'Database Cluster (MySQL 8.0)', bold: true },
            c2: { id: 'r2-c2', content: 'InnoDB with Hourly Automated Snapshots' },
            c3: { id: 'r2-c3', content: '99.99%' },
            c4: { id: 'r2-c4', content: 'Zero-downtime replication' },
            c5: { id: 'r2-c5', content: 'Healthy', bold: true }
          }
        },
        {
          id: 'r3',
          cells: {
            c1: { id: 'r3-c1', content: 'SSL / TLS & CDN Edge', bold: true },
            c2: { id: 'r3-c2', content: 'Cloudflare Pro with WAF Protection', colSpan: 2 },
            c3: { id: 'r3-c3', content: '', isMergedHidden: true },
            c4: { id: 'r3-c4', content: 'Automated 90-Day Renewal' },
            c5: { id: 'r3-c5', content: 'Active', bold: true }
          }
        }
      ],
      created_at: '2026-03-18',
      updated_at: '2026-03-18'
    }
  },
  {
    id: 'file-103',
    client_id: 2,
    client_name: 'State Renewable Energy Board',
    file_name: 'SREB_Govt_Tender_Compliance_Docket.pdf',
    category: 'Uploaded Document',
    file_type: 'pdf',
    file_size: '1.4 MB',
    uploaded_at: '2026-02-10',
    uploaded_by: 'Varun Admin',
    tag: 'Govt Compliance',
    reference_type: 'upload'
  },
  {
    id: 'file-104',
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    file_name: 'Brand_Assets_Logo_Guidelines.docx',
    category: 'Uploaded Document',
    file_type: 'docx',
    file_size: '850 KB',
    uploaded_at: '2026-03-01',
    uploaded_by: 'Sneha Kapoor',
    tag: 'Brand Assets',
    reference_type: 'upload'
  }
];
