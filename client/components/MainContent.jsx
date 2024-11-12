import React from 'react';
import styled from 'styled-components';
import Statistics from './Statistics';
import OwnershipChart from './OwnershipChart';
import Activities from './Activities';
import Summary from './Summary';

const MainContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  width: 1028px;
  height: 768px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 16px;
`;

const MainContent: React.FC = () => {
  return (
    <MainContentContainer>
      <Title>Overview View your company's captable</Title>
      <Statistics />
      <OwnershipChart />
      <Activities />
      <Summary />
    </MainContentContainer>
  );
};

export default MainContent;