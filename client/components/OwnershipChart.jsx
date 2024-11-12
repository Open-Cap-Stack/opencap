import React from 'react';
import styled from 'styled-components';

const ChartContainer = styled.div`
  display: flex;
  margin-bottom: 16px;
`;

const OwnershipList = styled.div`
  flex: 1;
`;

const OwnershipItem = styled.div`
  margin-bottom: 8px;
`;

const PieChart = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: conic-gradient(
    #6666ff 0deg 97.2deg,
    #9999ff 97.2deg 187.2deg,
    #ccccff 187.2deg 252deg,
    #ffcccc 252deg 306deg,
    #ffeecc 306deg 360deg
  );
`;

const OwnershipChart: React.FC = () => {
  const ownershipData = [
    { name: 'Allen Smith', percentage: 27 },
    { name: 'Toby Mornin', percentage: 25 },
    { name: 'Others', percentage: 18 },
    { name: 'Equity Plan', percentage: 15 },
    { name: 'USA Ventures', percentage: 10 },
  ];

  return (
    <ChartContainer>
      <OwnershipList>
        {ownershipData.map((item, index) => (
          <OwnershipItem key={index}>
            {item.name} {item.percentage}%
          </OwnershipItem>
        ))}
      </OwnershipList>
      <PieChart />
    </ChartContainer>
  );
};

export default OwnershipChart;