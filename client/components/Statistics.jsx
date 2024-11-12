import React from 'react';
import styled from 'styled-components';

const StatisticsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.span`
  font-size: 14px;
  color: #666;
`;

const StatValue = styled.span`
  font-size: 24px;
  font-weight: bold;
`;

const Statistics: React.FC = () => {
  return (
    <StatisticsContainer>
      <StatItem>
        <StatLabel>Amount raised</StatLabel>
        <StatValue>$25.00M</StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>Diluted shares</StatLabel>
        <StatValue>7.56M</StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>Stakeholders</StatLabel>
        <StatValue>4</StatValue>
      </StatItem>
    </StatisticsContainer>
  );
};

export default Statistics;