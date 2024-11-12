import React from 'react';
import styled from 'styled-components';

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  width: 200px;
  height: 768px;
  background-color: #f0f0f0;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
`;

const NavItem = styled.div`
  margin-bottom: 8px;
  cursor: pointer;
  &:hover {
    color: #0066cc;
  }
`;

const Sidebar: React.FC = () => {
  const navItems = [
    'Overview', 'Captable', 'Stakeholders', 'Share classes', 'Equity plans',
    'Securities', 'Fundraise', 'Documents', 'Updates', 'Reports', 'Audits',
    'Settings', 'Form 3921', '409A Valuation'
  ];

  return (
    <SidebarContainer>
      <Logo>Musa Capital</Logo>
      {navItems.map((item, index) => (
        <NavItem key={index}>{item}</NavItem>
      ))}
    </SidebarContainer>
  );
};

export default Sidebar;