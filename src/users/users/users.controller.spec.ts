import { UsersController } from './users.controller';

describe('UsersController', () => {
  const usersServiceMock: { findAll: jest.Mock } = {
    findAll: jest.fn(),
  };

  const controller = new UsersController(usersServiceMock as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates findAll to service', async () => {
    usersServiceMock.findAll.mockResolvedValue([
      { id: '1', email: 'a@a.com', roles: ['USER'] },
    ]);

    const result = await controller.findAll({
      sub: 'u1',
      organizationId: 'org-1',
    });

    expect(usersServiceMock.findAll).toHaveBeenCalledWith({
      sub: 'u1',
      organizationId: 'org-1',
    });
    expect(result).toHaveLength(1);
  });
});
