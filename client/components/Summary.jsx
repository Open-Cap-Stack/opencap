import React from 'react';
import styled from 'styled-components';

const SummaryContainer = styled.div`
  margin-bottom: 16px;
`;

const SummaryTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 8px;
`;

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 8px;
  background-color: #f0f0f0;
`;

const TableCell = styled.td`
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
`;

const Summary: React.FC = () => {
  const summaryData = [
    { shareClass: 'Common shares', authorizedShares: '7,000,000', dilutedShares: '4,500,000', ownership: '53%', amountRaised: '$10,000,000' },
    { shareClass: 'Preferred (Series A)', authorizedShares: '2,000,000', dilutedShares: '1,500,000', ownership: '15%', amountRaised: '$18,000,000' },
    { shareClass: 'Preferred (Convertible note)', authorizedShares: '1,000,000', dilutedShares: '500,000', ownership: '7%', amountRaised: '$7,000,000' },
  ];

  return (
    <SummaryContainer>
      <SummaryTitle>Summary of your company's captable</SummaryTitle>
      <SummaryTable>
        <thead>
          <tr>
            <TableHeader>Share class</TableHeader>
            <TableHeader>Authorized shares</TableHeader>
            <TableHeader>Diluted shares</TableHeader>
            <TableHeader>Ownership</TableHeader>
            <TableHeader>Amount raised</TableHeader>
          </tr>
        </thead>
        <tbody>
          {summaryData.map((row, index) => (
            <tr key={index}>
              <TableCell>{row.shareClass}</TableCell>
              <TableCell>{row.authorizedShares}</TableCell>
              <TableCell>{row.dilutedShares}</TableCell>
              <TableCell>{row.ownership}</TableCell>
              <TableCell>{row.amountRaised}</TableCell>
            </tr>
          ))}
        </tbody>
      </SummaryTable>
    </SummaryContainer>
  );
};

export default Summary;