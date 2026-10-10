/**
 * Enterprise Mapper Interface
 * Enforces a strict contract for mapping Database Entities to Client DTOs
 * and Client DTOs to Database Payloads.
 */
export interface IMapper<
  Entity,
  ResponseDto,
  CreateDto = any,
  UpdateDto = any,
> {
  toDto(entity: Entity): ResponseDto;
  toEntityPayload(dto: CreateDto): Partial<Entity>;
  toUpdatePayload(dto: UpdateDto): Partial<Entity>;
}

/**
 * Abstract Base Mapper providing common conversion utilities
 */
export abstract class BaseMapper<
  Entity,
  ResponseDto,
  CreateDto = any,
  UpdateDto = any,
> implements IMapper<Entity, ResponseDto, CreateDto, UpdateDto> {
  abstract toDto(entity: Entity): ResponseDto;
  abstract toEntityPayload(dto: CreateDto): Partial<Entity>;
  abstract toUpdatePayload(dto: UpdateDto): Partial<Entity>;

  /**
   * Bulk maps an array of entities to DTOs
   */
  toDtoArray(entities: Entity[]): ResponseDto[] {
    if (!entities || !Array.isArray(entities)) return [];
    return entities.map((entity) => this.toDto(entity));
  }
}
