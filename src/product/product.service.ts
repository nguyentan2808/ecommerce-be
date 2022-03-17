import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getConnection, Repository } from 'typeorm';
import { CategoryService } from './../category/category.service';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(ProductImage) private productImageRepository: Repository<ProductImage>,
    private readonly categoryService: CategoryService
  ) {}

  async create(createProductInput: CreateProductInput) {
    const { images, categories } = createProductInput;

    const _images = await Promise.all(
      [...images].map((item) => {
        const productImage = new ProductImage();
        productImage.url = item;
        return this.productImageRepository.save(productImage);
      })
    );

    const _categories = await Promise.all(
      [...categories].map((categoryName) => {
        return this.categoryService.findByName(categoryName);
      })
    );

    const product = new Product();

    Object.assign(product, createProductInput);
    product.images = _images;
    product.categories = _categories;

    await this.productRepository.save(product);
    return product;
  }

  async findAll({ limit, page }) {
    const _list = this.productRepository.find({
      relations: ['categories', 'images'],
      skip: limit * (page - 1),
      take: limit,
    });

    const _total = this.productRepository.count();
    const [list, total] = await Promise.all([_list, _total]);

    return {
      list,
      total,
    };
  }

  findOne(id: number) {
    return this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'images'],
    });
  }

  async update(id: number, updateProductInput: UpdateProductInput) {
    const product = await this.productRepository.findOne(id);
    if (!product) throw new NotFoundException('Product not found');

    const { images, categories } = updateProductInput;

    const _images = await Promise.all(
      [...images].map((item) => {
        const productImage = new ProductImage();
        productImage.url = item;
        return this.productImageRepository.save(productImage);
      })
    );

    const _categories = await Promise.all(
      [...categories].map((categoryName) => {
        return this.categoryService.findByName(categoryName);
      })
    );

    Object.assign(product, updateProductInput);

    product.images = _images;
    product.categories = _categories;

    return this.productRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException();
    }
    await this.productRepository.remove(product);
    return true;
  }

  getImages(id: number) {
    return this.productImageRepository.find({ where: { productId: id } });
  }

  async getCategories(id: number) {
    return getConnection().createQueryBuilder().relation(Product, 'categories').of(id).loadMany();
  }

  // async test() {
  //   const category = await this.categoryService.findOne('Jordan');
  //   const product = await this.productRepository.findOne({
  //     where: { name: 'Product 1' },
  //     relations: ['categories'],
  //   });

  //   product.categories.push(category);
  //   // const product = new Product();
  //   // product.name = 'Product 2';
  //   // product.categories = [category];

  //   await this.productRepository.save(product);
  //   return true;
  // }

  // async test() {
  //   const photo1 = new ProductImage();
  //   photo1.url = 'me.jpg';
  //   await this.productImageRepository.save(photo1);

  //   const photo2 = new ProductImage();
  //   photo2.url = 'me-and-bears.jpg';
  //   await this.productImageRepository.save(photo2);

  //   const product = new Product();
  //   product.name = 'John';
  //   product.images = [photo1, photo2];
  //   await this.productRepository.save(product);

  //   // await this.productRepository.delete({ id: 2 });

  //   return true;
  // }
}
